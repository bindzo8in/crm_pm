import webpush from "web-push";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";
import { getAttendanceDate, formatInIST } from "@/lib/date";
import { broadcastNotificationUpdates } from "@/lib/notification-realtime";
import { getWeekendDays } from "@/services/attendance-settings-service";
import {
  isEligibleForAttendanceReminder,
  isWithinAttendanceReminderWindow,
} from "@/lib/attendance-reminder-policy";

function isPrismaUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
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

function dateOnlyUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function sendAttendanceReminders(now = new Date()) {
  const settings = await prisma.attendanceSettings.findFirst({
    select: {
      attendanceReminderTime: true,
      expectedClockIn: true,
    },
  });

  const todayKey = getAttendanceDate(now);
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const currentTime = formatInIST(now);
  if (
    !isWithinAttendanceReminderWindow(
      currentTime,
      settings?.attendanceReminderTime ?? "08:30",
      settings?.expectedClockIn ?? "09:00",
    )
  ) {
    return {
      skipped: "Outside the configured reminder window.",
      notified: 0,
      pushSent: 0,
      pushSkipped: 0,
      pushFailures: 0,
    };
  }

  const weekendDays = await getWeekendDays();
  const [users, holidays, approvedLeaves, attendance, existingReminders] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          employmentStatus: "ACTIVE",
          OR: [{ banned: false }, { banned: null }],
        },
        select: {
          id: true,
          department: true,
          additionalDepartments: true,
          dateOfJoining: true,
          employmentEndedAt: true,
        },
      }),
      prisma.holiday.findMany({
        where: { date: today },
        select: { departments: true, isHalfDay: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { userId: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { date: today },
        select: { userId: true },
      }),
      prisma.attendanceReminder.findMany({
        where: { date: today },
        select: { userId: true, pushSentAt: true },
      }),
    ]);

  const fullDayHolidays = holidays.filter((holiday) => !holiday.isHalfDay);
  const holidayDepartments = fullDayHolidays.length > 0
    ? fullDayHolidays.map((holiday) => holiday.departments)
    : null;
  const leaveUserIds = new Set(approvedLeaves.map((leave) => leave.userId));
  const attendanceUserIds = new Set(attendance.map((record) => record.userId));
  const reminderByUser = new Map(
    existingReminders.map((reminder) => [reminder.userId, reminder]),
  );
  const subscriptions = await prisma.webPushSubscription.findMany({
    select: {
      id: true,
      userId: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });
  const subscriptionsByUser = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions) {
    const userSubscriptions = subscriptionsByUser.get(subscription.userId) ?? [];
    userSubscriptions.push(subscription);
    subscriptionsByUser.set(subscription.userId, userSubscriptions);
  }

  let notified = 0;
  let pushSent = 0;
  let pushSkipped = 0;
  let pushFailures = 0;
  const realtimeUserIds: string[] = [];
  const payload = JSON.stringify({
    title: "Attendance reminder",
    body: "Please mark your attendance before your shift starts.",
    url: "/attendance",
  });
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  let pushConfigured = Boolean(publicKey && privateKey);
  if (Boolean(publicKey) !== Boolean(privateKey)) {
    pushConfigured = false;
    pushFailures = 1;
    console.error("Attendance reminder VAPID configuration is incomplete.");
  }
  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(
        `mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`,
        publicKey,
        privateKey,
      );
    } catch (error: unknown) {
      pushConfigured = false;
      pushFailures = 1;
      console.error("Attendance reminder VAPID configuration is invalid.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  for (const user of users) {
    const joinedAfterToday =
      user.dateOfJoining && dateOnlyUtc(user.dateOfJoining) > today;
    const endedBeforeToday =
      user.employmentEndedAt && dateOnlyUtc(user.employmentEndedAt) < today;
    const isEligible =
      !joinedAfterToday &&
      !endedBeforeToday &&
      isEligibleForAttendanceReminder({
        date: today,
        weekendDays,
        department: user.department,
        additionalDepartments: user.additionalDepartments,
        holidayDepartments,
        hasApprovedLeave: leaveUserIds.has(user.id),
        hasAttendanceRecord: attendanceUserIds.has(user.id),
      });
    if (!isEligible) continue;

    let reminder = reminderByUser.get(user.id);
    if (!reminder) {
      try {
        await prisma.$transaction(async (transaction) => {
          await transaction.attendanceReminder.create({
            data: { userId: user.id, date: today },
          });
          await transaction.notification.create({
            data: {
              userId: user.id,
              type: "ATTENDANCE_REMINDER",
              title: "Attendance reminder",
              message: "Please mark your attendance before your shift starts.",
              href: "/attendance",
            },
          });
        });
        notified += 1;
        realtimeUserIds.push(user.id);
      } catch (error: unknown) {
        if (isPrismaUniqueViolation(error)) continue;
        throw error;
      }
      reminder = { userId: user.id, pushSentAt: null };
    }

    if (reminder.pushSentAt) continue;
    if (!pushConfigured) {
      pushSkipped += 1;
      continue;
    }
    const userSubscriptions = subscriptionsByUser.get(user.id) ?? [];
    if (userSubscriptions.length === 0) {
      pushSkipped += 1;
      continue;
    }

    let sentForUser = 0;
    await Promise.all(
      userSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
          );
          sentForUser += 1;
        } catch (error: unknown) {
          const statusCode = getPushStatusCode(error);
          if (statusCode === 404 || statusCode === 410) {
            await prisma.webPushSubscription.deleteMany({
              where: { id: subscription.id },
            });
            return;
          }
          pushFailures += 1;
          console.error("Attendance reminder push delivery failed.", {
            userId: user.id,
            statusCode,
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
        }
      }),
    );

    pushSent += sentForUser;
    if (sentForUser > 0) {
      await prisma.attendanceReminder.update({
        where: {
          userId_date: { userId: user.id, date: today },
        },
        data: { pushSentAt: new Date() },
      });
    }
  }

  await broadcastNotificationUpdates(realtimeUserIds);
  return { notified, pushSent, pushSkipped, pushFailures };
}
