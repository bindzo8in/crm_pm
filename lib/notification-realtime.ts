import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

export async function broadcastNotificationUpdates(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return;

  const timestamp = Date.now().toString();
  const body = JSON.stringify({ userIds: uniqueUserIds });
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  try {
    const response = await fetch(
      `http://127.0.0.1:${process.env.PORT || "3000"}/_internal/notifications/publish`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-notification-timestamp": timestamp,
          "x-notification-signature": signature,
        },
        body,
        cache: "no-store",
      },
    );
    if (!response.ok) {
      console.error("Unable to publish notification updates.", {
        status: response.status,
      });
    }
  } catch (error: unknown) {
    console.error("Unable to reach the notification realtime server.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
