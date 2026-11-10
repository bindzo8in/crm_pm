import { ActionError } from "@/lib/action-error";
import { getAttendanceDate } from "@/lib/date";
import { formatHolidayDateRange } from "@/lib/holiday-format";
import { parseDateOnly } from "@/lib/leave-policy";
import { sendHolidayAnnouncementEmails } from "@/lib/email";
import webpush from "web-push";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";
import { broadcastNotificationUpdates } from "@/lib/notification-realtime";
import {
  createHolidayEvent,
  deleteHolidayEvent,
  isUniqueHolidayDateConflict,
  listHolidays,
  listUpcomingHolidays,
  updateHolidayEvent,
  type HolidayWriteData,
} from "@/repositories/holiday-repository";
import type { Department } from "@/app/generated/prisma/enums";

async function sendHolidayEmails(
  result: Awaited<ReturnType<typeof createHolidayEvent>>,
  data: HolidayWriteData,
) {
  if (!data.notifyStaff || result.recipients.length === 0) {
    return { sent: 0, failed: 0 };
  }
  return sendHolidayAnnouncementEmails({
    recipients: result.recipients,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    category: data.category,
    departments: data.departments,
    isHalfDay: data.isHalfDay,
  });
}

async function sendHolidayPushNotifications(
  result: Awaited<ReturnType<typeof createHolidayEvent>>,
  data: HolidayWriteData,
) {
  if (!data.notifyStaff || result.recipients.length === 0) {
    return { pushSent: 0, pushFailures: 0 };
  }
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey && !privateKey) return { pushSent: 0, pushFailures: 0 };
  if (!publicKey || !privateKey) {
    console.error("Holiday announcement push configuration is incomplete.");
    return { pushSent: 0, pushFailures: 1 };
  }

  try {
    webpush.setVapidDetails(
      `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
      publicKey,
      privateKey,
    );
  } catch (error: unknown) {
    console.error("Holiday announcement push configuration is invalid.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { pushSent: 0, pushFailures: 1 };
  }

  const subscriptions = await prisma.webPushSubscription.findMany({
    where: { userId: { in: result.recipients.map(({ id }) => id) } },
    select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
  });
  const payload = JSON.stringify({
    title: `Holiday: ${data.name}`,
    body: `${formatHolidayDateRange(data.startDate, data.endDate)}${data.isHalfDay ? " · Half-day holiday; work the other half" : ""} · ${data.description || "Holiday announcement"}`,
    url: "/dashboard/holidays",
  });
  const deliveries = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
        return "sent" as const;
      } catch (error: unknown) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.webPushSubscription.deleteMany({
            where: { id: subscription.id },
          });
          return "expired" as const;
        }
        console.error("Holiday announcement push delivery failed.", {
          userId: subscription.userId,
          statusCode,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return "failed" as const;
      }
    }),
  );
  return {
    pushSent: deliveries.filter((delivery) => delivery === "sent").length,
    pushFailures: deliveries.filter((delivery) => delivery === "failed").length,
  };
}

export async function getHolidaysForYear(
  year: number,
  departments?: readonly Department[],
) {
  return listHolidays(
    new Date(Date.UTC(year, 0, 1)),
    new Date(Date.UTC(year + 1, 0, 1) - 1),
    departments,
  );
}

export async function getUpcomingHolidays(departments?: readonly Department[]) {
  const today = parseDateOnly(getAttendanceDate());
  return listUpcomingHolidays(today, departments);
}

export async function addHoliday(data: HolidayWriteData) {
  try {
    const result = await createHolidayEvent(data);
    await broadcastNotificationUpdates(
      data.notifyStaff ? result.recipients.map(({ id }) => id) : [],
    );
    const [emailDelivery, pushDelivery] = await Promise.all([
      sendHolidayEmails(result, data),
      sendHolidayPushNotifications(result, data),
    ]);
    return {
      holiday: result.holidays[0],
      notificationCount: result.notificationCount,
      ...emailDelivery,
      ...pushDelivery,
    };
  } catch (error) {
    if (isUniqueHolidayDateConflict(error)) {
      throw new ActionError(
        "One or more dates already have a holiday recorded.",
        409,
      );
    }
    throw error;
  }
}

export async function editHoliday(id: string, data: HolidayWriteData) {
  try {
    const result = await updateHolidayEvent(id, data);
    await broadcastNotificationUpdates(
      data.notifyStaff ? result.recipients.map(({ id }) => id) : [],
    );
    const [emailDelivery, pushDelivery] = await Promise.all([
      sendHolidayEmails(result, data),
      sendHolidayPushNotifications(result, data),
    ]);
    return {
      holiday: result.holidays[0],
      notificationCount: result.notificationCount,
      ...emailDelivery,
      ...pushDelivery,
    };
  } catch (error) {
    if (isUniqueHolidayDateConflict(error)) {
      throw new ActionError(
        "One or more dates already have a holiday recorded.",
        409,
      );
    }
    if (error instanceof Error && error.message === "Holiday not found.") {
      throw new ActionError("Holiday not found.", 404);
    }
    throw error;
  }
}

export async function removeHoliday(id: string) {
  try {
    await deleteHolidayEvent(id);
  } catch (error) {
    if (error instanceof Error && error.message === "Holiday not found.") {
      throw new ActionError("Holiday not found.", 404);
    }
    throw error;
  }
}
