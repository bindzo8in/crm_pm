import prisma from "@/lib/prisma";
import {
  formatInIST,
  getAttendanceDate,
  shiftDateOnly,
} from "@/lib/date";
import { getDueAttendanceScheduleDate } from "@/lib/attendance-schedule-reminder-policy";
import { broadcastNotificationUpdates } from "@/lib/notification-realtime";
import { getWeekendDays } from "@/services/attendance-settings-service";
import { isPrismaUniqueViolation } from "@/lib/prisma-errors";
import {
  configureAttendanceWebPush,
  sendAttendancePushToUser,
} from "@/lib/attendance-web-push";
import {
  isEligibleForAttendanceReminder,
  timeToMinutes,
} from "@/lib/attendance-reminder-policy";

type ScheduleReminderType = "CLOCK_IN" | "CLOCK_OUT";

interface ScheduleReminderCandidate {
  userId: string;
  date: Date;
  type: ScheduleReminderType;
  pushEnabled: boolean;
}

function asDateOnly(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function reminderKey(userId: string, date: Date, type: string) {
  return `${userId}:${date.toISOString().slice(0, 10)}:${type}`;
}

export async function sendAttendanceScheduleReminders(
  organizationId: string,
  now = new Date(),
) {
  const settings = await prisma.attendanceSettings.findUnique({
    where: { organizationId },
    select: { expectedClockIn: true, expectedClockOut: true },
  });

  const today = getAttendanceDate(now);
  const currentTime = formatInIST(now);
  const clockInDate = getDueAttendanceScheduleDate(
    currentTime,
    settings?.expectedClockIn ?? "09:00",
    today,
  );
  const clockOutDate = getDueAttendanceScheduleDate(
    currentTime,
    settings?.expectedClockOut ?? "18:00",
    today,
  );

  if (!clockInDate && !clockOutDate) {
    return {
      skipped: "Outside the configured shift reminder windows.",
      notified: 0,
      pushSent: 0,
      pushSkipped: 0,
      pushFailures: 0,
    };
  }

  const users = await prisma.user.findMany({
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
      clockInAlarmEnabled: true,
      clockOutAlarmEnabled: true,
    },
  });
  const userById = new Map(users.map((user) => [user.id, user]));
  const candidates: ScheduleReminderCandidate[] = [];

  if (clockInDate) {
    const shiftDate = asDateOnly(clockInDate);
    const [weekendDays, holidays, approvedLeaves, attendance] =
      await Promise.all([
        getWeekendDays(organizationId),
        prisma.holiday.findMany({
          where: { organizationId, date: shiftDate },
          select: { departments: true, isHalfDay: true },
        }),
        prisma.leaveRequest.findMany({
          where: {
            organizationId,
            status: "APPROVED",
            startDate: { lte: shiftDate },
            endDate: { gte: shiftDate },
          },
          select: { userId: true },
        }),
        prisma.attendanceRecord.findMany({
          where: { organizationId, date: shiftDate },
          select: { userId: true },
        }),
      ]);

    const fullDayHolidays = holidays.filter((holiday) => !holiday.isHalfDay);
    const holidayDepartments = fullDayHolidays.length > 0
      ? fullDayHolidays.map((holiday) => holiday.departments)
      : null;
    const leaveUserIds = new Set(approvedLeaves.map((leave) => leave.userId));
    const attendanceUserIds = new Set(attendance.map((record) => record.userId));

    for (const user of users) {
      const joinedAfterShiftDate =
        user.dateOfJoining &&
        new Date(Date.UTC(
          user.dateOfJoining.getUTCFullYear(),
          user.dateOfJoining.getUTCMonth(),
          user.dateOfJoining.getUTCDate(),
        )) > shiftDate;
      const endedBeforeShiftDate =
        user.employmentEndedAt &&
        new Date(Date.UTC(
          user.employmentEndedAt.getUTCFullYear(),
          user.employmentEndedAt.getUTCMonth(),
          user.employmentEndedAt.getUTCDate(),
        )) < shiftDate;
      if (
        !user.clockInAlarmEnabled ||
        joinedAfterShiftDate ||
        endedBeforeShiftDate ||
        !isEligibleForAttendanceReminder({
          date: shiftDate,
          weekendDays,
          department: user.department,
          additionalDepartments: user.additionalDepartments,
          holidayDepartments,
          hasApprovedLeave: leaveUserIds.has(user.id),
          hasAttendanceRecord: attendanceUserIds.has(user.id),
        })
      ) {
        continue;
      }

      candidates.push({
        userId: user.id,
        date: shiftDate,
        type: "CLOCK_IN",
        pushEnabled: true,
      });
    }
  }

  if (clockOutDate) {
    const clockInMinutes = timeToMinutes(settings?.expectedClockIn ?? "09:00");
    const clockOutMinutes = timeToMinutes(settings?.expectedClockOut ?? "18:00");
    const overnightShift =
      clockInMinutes !== null &&
      clockOutMinutes !== null &&
      clockOutMinutes < clockInMinutes;
    const shiftDate = overnightShift
      ? shiftDateOnly(clockOutDate, -1)
      : clockOutDate;
    const activeRecords = await prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        date: asDateOnly(shiftDate),
        clockOut: null,
        isAutoCheckedOut: false,
      },
      select: { userId: true },
    });

    for (const record of activeRecords) {
      const user = userById.get(record.userId);
      if (!user) continue;

      candidates.push({
        userId: user.id,
        date: asDateOnly(clockOutDate),
        type: "CLOCK_OUT",
        pushEnabled: user.clockOutAlarmEnabled,
      });
    }
  }

  if (candidates.length === 0) {
    return { notified: 0, pushSent: 0, pushSkipped: 0, pushFailures: 0 };
  }

  const eventDates = [...new Set(
    candidates.map((candidate) => candidate.date.toISOString().slice(0, 10)),
  )].map(asDateOnly);
  const existingReminders = await prisma.attendanceAlarm.findMany({
    where: { organizationId, date: { in: eventDates } },
    select: { id: true, userId: true, date: true, type: true, pushSentAt: true },
  });
  const remindersByKey = new Map(
    existingReminders.map((reminder) => [
      reminderKey(reminder.userId, reminder.date, reminder.type),
      reminder,
    ]),
  );

  let notified = 0;
  let pushSent = 0;
  let pushSkipped = 0;
  let pushFailures = 0;
  const realtimeUserIds: string[] = [];

  const pushCandidates = candidates.filter((candidate) => candidate.pushEnabled);
  const pushUserIds = [...new Set(pushCandidates.map((candidate) => candidate.userId))];
  const subscriptions = pushUserIds.length > 0
    ? await prisma.webPushSubscription.findMany({
        where: { userId: { in: pushUserIds } },
        select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
      })
    : [];
  const subscriptionsByUser = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions) {
    const userSubscriptions = subscriptionsByUser.get(subscription.userId) ?? [];
    userSubscriptions.push(subscription);
    subscriptionsByUser.set(subscription.userId, userSubscriptions);
  }

  const pushConfiguration = pushCandidates.length > 0
    ? configureAttendanceWebPush()
    : { configured: false, failures: 0 };
  const pushConfigured = pushConfiguration.configured;
  pushFailures += pushConfiguration.failures;

  for (const candidate of candidates) {
    const key = reminderKey(candidate.userId, candidate.date, candidate.type);
    let reminder = remindersByKey.get(key);
    if (!reminder) {
      try {
        reminder = await prisma.$transaction(async (transaction) => {
          const createdReminder = await transaction.attendanceAlarm.create({
            data: {
              organizationId,
              userId: candidate.userId,
              date: candidate.date,
              type: candidate.type,
            },
            select: { id: true, userId: true, date: true, type: true, pushSentAt: true },
          });
          if (candidate.type === "CLOCK_OUT") {
            await transaction.notification.create({
              data: {
                organizationId,
                userId: candidate.userId,
                type: "ATTENDANCE_REMINDER",
                title: "Clock-out reminder",
                message: "Your shift is scheduled to end. Please clock out if your workday is complete.",
                href: "/attendance",
              },
            });
          }
          return createdReminder;
        });
        remindersByKey.set(key, reminder);
        if (candidate.type === "CLOCK_OUT") {
          notified += 1;
          realtimeUserIds.push(candidate.userId);
        }
      } catch (error: unknown) {
        if (!isPrismaUniqueViolation(error)) throw error;
        reminder = await prisma.attendanceAlarm.findUnique({
          where: {
            organizationId_userId_date_type: {
              organizationId,
              userId: candidate.userId,
              date: candidate.date,
              type: candidate.type,
            },
          },
          select: { id: true, userId: true, date: true, type: true, pushSentAt: true },
        }) ?? undefined;
        if (!reminder) throw new Error("Attendance schedule reminder could not be retrieved.");
        remindersByKey.set(key, reminder);
      }
    }

    if (!candidate.pushEnabled || reminder.pushSentAt) continue;
    if (!pushConfigured) {
      pushSkipped += 1;
      continue;
    }

    const userSubscriptions = subscriptionsByUser.get(candidate.userId) ?? [];
    if (userSubscriptions.length === 0) {
      pushSkipped += 1;
      continue;
    }

    const payload = JSON.stringify(
      candidate.type === "CLOCK_IN"
        ? {
            title: "Clock-in reminder",
            body: "Your shift starts now. Please mark your attendance.",
            url: "/attendance",
          }
        : {
            title: "Clock-out reminder",
            body: "Your shift is scheduled to end. Please clock out if your workday is complete.",
            url: "/attendance",
          },
    );

    const delivery = await sendAttendancePushToUser(
      candidate.userId,
      userSubscriptions,
      payload,
      "Attendance schedule reminder",
    );

    pushSent += delivery.sent;
    pushFailures += delivery.failures;
    if (delivery.sent > 0) {
      await prisma.attendanceAlarm.update({
        where: {
          organizationId_userId_date_type: {
            organizationId,
            userId: candidate.userId,
            date: candidate.date,
            type: candidate.type,
          },
        },
        data: { pushSentAt: now },
      });
    }
  }

  await broadcastNotificationUpdates(realtimeUserIds);
  return { notified, pushSent, pushSkipped, pushFailures };
}
