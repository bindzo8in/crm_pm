import prisma from "@/lib/prisma";
import { getAttendanceDate, formatInIST } from "@/lib/date";
import { broadcastNotificationUpdates } from "@/lib/notification-realtime";
import { getWeekendDays } from "@/services/attendance-settings-service";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import {
  configureAttendanceWebPush,
  sendAttendancePushToUser,
} from "@/lib/attendance-web-push";
import {
  isEligibleForAttendanceReminder,
  isWithinAttendanceReminderWindow,
} from "@/lib/attendance-reminder-policy";

function dateOnlyUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function sendAttendanceReminders(
  organizationId: string,
  now = new Date(),
) {
  const settings = await prisma.attendanceSettings.findUnique({
    where: { organizationId },
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

  const weekendDays = await getWeekendDays(organizationId);
  const [users, holidays, approvedLeaves, attendance, existingReminders] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          organizationMemberships: { some: { organizationId } },
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
        where: { organizationId, date: today },
        select: { departments: true, isHalfDay: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          organizationId,
          status: "APPROVED",
          startDate: { lte: today },
          endDate: { gte: today },
        },
        select: { userId: true },
      }),
      prisma.attendanceRecord.findMany({
        where: { organizationId, date: today },
        select: { userId: true },
      }),
      prisma.attendanceReminder.findMany({
        where: { organizationId, date: today },
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
    where: { userId: { in: users.map(({ id }) => id) } },
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
  const pushConfiguration = configureAttendanceWebPush();
  const pushConfigured = pushConfiguration.configured;
  pushFailures += pushConfiguration.failures;

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
            data: { organizationId, userId: user.id, date: today },
          });
          await transaction.notification.create({
            data: {
              organizationId,
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

    const delivery = await sendAttendancePushToUser(
      user.id,
      userSubscriptions,
      payload,
      "Attendance reminder",
    );

    pushSent += delivery.sent;
    pushFailures += delivery.failures;
    if (delivery.sent > 0) {
      await prisma.attendanceReminder.update({
        where: {
          organizationId_userId_date: {
            organizationId,
            userId: user.id,
            date: today,
          },
        },
        data: { pushSentAt: new Date() },
      });
    }
  }

  await broadcastNotificationUpdates(realtimeUserIds);
  return { notified, pushSent, pushSkipped, pushFailures };
}
