import webpush from "web-push";
import { env } from "@/lib/env";
import {
  deleteWebPushSubscription,
  listWebPushSubscriptionsForUsers,
} from "@/repositories/leave-repository";

function getPushStatusCode(error: unknown): number | null {
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

export async function sendLeavePushNotification(
  userIds: string[],
  title: string,
  message: string,
) {
  const subscriptions = await listWebPushSubscriptionsForUsers([...new Set(userIds)]);
  if (subscriptions.length === 0) return;

  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.error("Leave notification push delivery is not configured.", {
      hasPublicKey: Boolean(publicKey),
      hasPrivateKey: Boolean(privateKey),
    });
    return;
  }

  try {
    webpush.setVapidDetails(
      `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
      publicKey,
      privateKey,
    );
  } catch (error: unknown) {
    console.error("Leave notification push configuration is invalid.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return;
  }

  const payload = JSON.stringify({ title, body: message, url: "/dashboard/leaves" });
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
      } catch (error: unknown) {
        const statusCode = getPushStatusCode(error);
        if (statusCode === 404 || statusCode === 410) {
          try {
            await deleteWebPushSubscription(subscription.id);
          } catch (deleteError: unknown) {
            console.error("Unable to remove an expired leave notification subscription.", {
              userId: subscription.userId,
              errorName: deleteError instanceof Error ? deleteError.name : "UnknownError",
            });
          }
          return;
        }

        console.error("Leave notification push delivery failed.", {
          userId: subscription.userId,
          statusCode,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }),
  );
}
