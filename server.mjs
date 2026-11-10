import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const realtimeServer = new WebSocketServer({ noServer: true });
const projectSubscribers = new WeakMap();
const notificationSubscribers = new WeakMap();
const maxNotificationPublishBytes = 64 * 1024;

function isSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin || !request.headers.host) return false;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

async function canAccessProject(projectId, cookie) {
  if (!projectId || !cookie) return false;
  const response = await fetch(`http://127.0.0.1:${port}/api/chat/realtime/authorize?projectId=${encodeURIComponent(projectId)}`, {
    headers: {
      cookie,
      host: `127.0.0.1:${port}`,
      origin: `http://127.0.0.1:${port}`,
      "x-forwarded-host": `127.0.0.1:${port}`,
      "x-forwarded-proto": "http",
    },
  });
  return response.ok;
}

async function getNotificationUserId(cookie) {
  if (!cookie) return null;
  const response = await fetch(`http://127.0.0.1:${port}/api/notifications/realtime/authorize`, {
    headers: {
      cookie,
      host: `127.0.0.1:${port}`,
      origin: `http://127.0.0.1:${port}`,
      "x-forwarded-host": `127.0.0.1:${port}`,
      "x-forwarded-proto": "http",
    },
  });
  if (!response.ok) return null;
  const result = await response.json();
  return typeof result.userId === "string" ? result.userId : null;
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function handleNotificationPublish(request, response) {
  const secret = process.env.BETTER_AUTH_SECRET;
  const timestamp = request.headers["x-notification-timestamp"];
  const signature = request.headers["x-notification-signature"];
  const parsedTimestamp = typeof timestamp === "string" ? Number(timestamp) : Number.NaN;
  if (
    !secret ||
    typeof timestamp !== "string" ||
    typeof signature !== "string" ||
    !Number.isSafeInteger(parsedTimestamp) ||
    Math.abs(Date.now() - parsedTimestamp) > 60_000
  ) {
    sendJson(response, 401, { message: "Unauthorized." });
    return;
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > maxNotificationPublishBytes) {
      sendJson(response, 413, { message: "Request is too large." });
      return;
    }
    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest();
  const supplied = Buffer.from(signature, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    sendJson(response, 401, { message: "Unauthorized." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    sendJson(response, 400, { message: "Invalid request body." });
    return;
  }
  const userIds = payload?.userIds;
  if (
    !Array.isArray(userIds) ||
    userIds.length > 1000 ||
    userIds.some((userId) => typeof userId !== "string" || userId.length < 1 || userId.length > 100)
  ) {
    sendJson(response, 400, { message: "Invalid notification recipients." });
    return;
  }

  const recipientIds = new Set(userIds);
  for (const client of realtimeServer.clients) {
    if (
      client.readyState === WebSocket.OPEN &&
      recipientIds.has(notificationSubscribers.get(client))
    ) {
      client.send(JSON.stringify({ type: "notifications-refresh" }));
    }
  }
  sendJson(response, 200, { success: true });
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host}`).pathname;
  if (request.method === "POST" && pathname === "/_internal/notifications/publish") {
    void handleNotificationPublish(request, response).catch((error) => {
      console.error("Notification realtime publish failed.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      if (!response.headersSent) {
        sendJson(response, 500, { message: "Notification update could not be published." });
      } else {
        response.destroy();
      }
    });
    return;
  }
  void handle(request, response);
});

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "/", `http://${request.headers.host}`).pathname;
  if (pathname !== "/api/chat/ws") return;

  realtimeServer.handleUpgrade(request, socket, head, (client) => {
    projectSubscribers.set(client, new Set());
    realtimeServer.emit("connection", client, request);
  });
});

realtimeServer.on("connection", (client, request) => {
  client.on("message", async (raw) => {
    try {
      const payload = JSON.parse(raw.toString());
      if (payload?.type === "subscribe-notifications") {
        if (!isSameOrigin(request)) {
          client.close(4403, "Origin denied");
          return;
        }

        const userId = await getNotificationUserId(request.headers.cookie);
        if (!userId) {
          client.close(4401, "Sign in required");
          return;
        }

        notificationSubscribers.set(client, userId);
        client.send(JSON.stringify({ type: "notifications-subscribed" }));
        return;
      }

      const projectId = typeof payload.projectId === "string" ? payload.projectId : "";
      if (!projectId || !["subscribe", "publish"].includes(payload.type)) return;

      const authorized = await canAccessProject(projectId, request.headers.cookie);
      if (!authorized) {
        client.close(4403, "Project access denied");
        return;
      }

      const subscriptions = projectSubscribers.get(client) || new Set();
      if (payload.type === "subscribe") {
        subscriptions.add(projectId);
        projectSubscribers.set(client, subscriptions);
        client.send(JSON.stringify({ type: "subscribed", projectId }));
        return;
      }

      for (const member of realtimeServer.clients) {
        if (member.readyState !== WebSocket.OPEN) continue;
        const memberSubscriptions = projectSubscribers.get(member);
        if (memberSubscriptions?.has(projectId)) {
          member.send(JSON.stringify({ type: "refresh", projectId }));
        }
      }
    } catch {
      client.send(JSON.stringify({ type: "error", message: "Invalid realtime message." }));
    }
  });
});

server.listen(port, hostname, () => {
  const displayHostname = hostname === "0.0.0.0" ? "localhost" : hostname;
  const bindDescription = hostname === "0.0.0.0" ? " (bound to all interfaces)" : "";
  console.log(`CRM listening on http://${displayHostname}:${port}${bindDescription}`);
});
