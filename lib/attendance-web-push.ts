import webpush from "web-push";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";

export interface AttendancePushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function getPushStatusCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }
  return null;
}

export function configureAttendanceWebPush() {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey && !privateKey) {
    return { configured: false, failures: 0 };
  }
  if (!publicKey || !privateKey) {
    console.error("Attendance reminder VAPID configuration is incomplete.");
    return { configured: false, failures: 1 };
  }

  try {
    webpush.setVapidDetails(
      `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
      publicKey,
      privateKey,
    );
    return { configured: true, failures: 0 };
  } catch (error: unknown) {
    console.error("Attendance reminder VAPID configuration is invalid.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { configured: false, failures: 1 };
  }
}

export async function sendAttendancePushToUser(
  userId: string,
  subscriptions: readonly AttendancePushSubscription[],
  payload: string,
  context: string,
) {
  let sent = 0;
  let failures = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
        sent += 1;
      } catch (error: unknown) {
        const statusCode = getPushStatusCode(error);
        if (statusCode === 404 || statusCode === 410) {
          await prisma.webPushSubscription.deleteMany({
            where: { id: subscription.id },
          });
          return;
        }
        failures += 1;
        console.error(`${context} push delivery failed.`, {
          userId,
          statusCode,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }),
  );

  return { sent, failures };
}
