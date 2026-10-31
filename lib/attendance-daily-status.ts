export type DailyAttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "PENDING_LEAVE"
  | "HOLIDAY"
  | "WEEKEND"
  | "AWAITING_ATTENDANCE";

export type LeaveRange = {
  userId: string;
  startDate: Date;
  endDate: Date;
  status: "APPROVED" | "PENDING" | "REJECTED";
  type: string;
};

export type HolidayRange = {
  date: Date;
  name: string;
  departments: string[];
};

type AttendanceLike = {
  id: string;
  userId: string;
  date: Date;
  status: DailyAttendanceStatus | string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    employeeId: string | number | null;
    department: string | null;
    designation?: string | null;
  };
  clockIn?: Date | null;
  clockOut?: Date | null;
  workMode?: string | null;
  department?: string | null;
  workMinutes?: number;
  breakMinutes?: number;
  overtimeMinutes?: number;
  lateMinutes?: number;
  earlyLeave?: boolean;
  isAutoCheckedOut?: boolean;
  regularized?: boolean;
  isManuallyEdited?: boolean;
  distanceFromOffice?: number | null;
  regularizationReason?: string | null;
  notes?: string | null;
  holidayName?: string;
  leaveType?: string;
  leaveRequestStatus?: string;
  isSynthetic?: boolean;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayStartUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function iterDays(start: Date, end: Date) {
  const dates: Date[] = [];
  const cursor = dayStartUtc(start);
  const final = dayStartUtc(end);

  while (cursor <= final) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function buildResolvedAttendanceTimeline<TUser extends {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | number | null;
  department: string | null;
  designation?: string | null;
  createdAt?: Date;
  dateOfJoining?: Date | null;
  employmentEndedAt?: Date | null;
  employmentStatus?: string;
  banned?: boolean | null;
}, TRecord extends Omit<AttendanceLike, "status"> & { status: string }>(
  users: TUser[],
  attendanceRecords: TRecord[],
  leaveRequests: LeaveRange[],
  holidays: HolidayRange[],
  startDate: Date,
  endDate: Date,
  today = new Date(),
) {
  const cutoff = dayStartUtc(today) < dayStartUtc(endDate)
    ? dayStartUtc(today)
    : dayStartUtc(endDate);
  const actualByKey = new Map(
    attendanceRecords.map((record) => [
      `${record.userId}:${dateKey(new Date(record.date))}`,
      record,
    ]),
  );
  const timeline: Array<TRecord | AttendanceLike> = [];

  for (const user of users) {
    const userHolidays = holidays.filter(
      (holiday) =>
        holiday.departments.length === 0 ||
        holiday.departments.includes(user.department ?? ""),
    );
    const userLeaves = leaveRequests.filter((leave) => leave.userId === user.id);

    for (const date of iterDays(startDate, endDate)) {
      if (date > cutoff) continue;

      const key = `${user.id}:${dateKey(date)}`;
      const holiday = userHolidays.find(
        (item) => dateKey(new Date(item.date)) === dateKey(date),
      );
      const actual = actualByKey.get(key);
      const leave = userLeaves.find(
        (request) =>
          request.status === "APPROVED" &&
          date >= dayStartUtc(request.startDate) &&
          date <= dayStartUtc(request.endDate),
      );
      const pendingLeave = userLeaves.find(
        (request) =>
          request.status === "PENDING" &&
          date >= dayStartUtc(request.startDate) &&
          date <= dayStartUtc(request.endDate),
      );
      const isWorkedStatus =
        actual &&
        ["PRESENT", "LATE", "HALF_DAY"].includes(actual.status);

      if (isWorkedStatus) {
        timeline.push({
          ...actual,
          ...(holiday ? { holidayName: holiday.name } : {}),
          ...(leave
            ? {
                leaveType: leave.type,
                leaveRequestStatus: leave.status,
              }
            : {}),
        });
        continue;
      }

      const employmentStart = user.dateOfJoining ?? user.createdAt;
      if (employmentStart && date < dayStartUtc(employmentStart)) continue;
      if (
        user.employmentEndedAt &&
        date > dayStartUtc(user.employmentEndedAt)
      ) {
        continue;
      }
      if (
        (user.employmentStatus === "INACTIVE" || user.banned) &&
        !user.employmentEndedAt
      ) {
        continue;
      }

      if (holiday) {
        timeline.push({
          ...(actual ?? {}),
          id: actual?.id ?? `holiday:${key}`,
          userId: user.id,
          user,
          date,
          status: "HOLIDAY",
          holidayName: holiday.name,
          workMinutes: actual?.workMinutes ?? 0,
          breakMinutes: actual?.breakMinutes ?? 0,
          overtimeMinutes: actual?.overtimeMinutes ?? 0,
          lateMinutes: actual?.lateMinutes ?? 0,
          workMode: actual?.workMode ?? null,
          isSynthetic: !actual,
        });
        continue;
      }

      if (leave && !isWeekend(date)) {
        timeline.push({
          ...(actual ?? {}),
          id: actual?.id ?? `leave:${key}`,
          userId: user.id,
          user,
          date,
          status: "ON_LEAVE",
          leaveType: leave.type,
          leaveRequestStatus: leave.status,
          workMinutes: actual?.workMinutes ?? 0,
          breakMinutes: actual?.breakMinutes ?? 0,
          overtimeMinutes: actual?.overtimeMinutes ?? 0,
          lateMinutes: actual?.lateMinutes ?? 0,
          workMode: actual?.workMode ?? null,
          isSynthetic: !actual,
        });
        continue;
      }

      if (pendingLeave && !isWeekend(date)) {
        timeline.push({
          ...(actual ?? {}),
          id: actual?.id ?? `pending-leave:${key}`,
          userId: user.id,
          user,
          date,
          status: "PENDING_LEAVE",
          leaveType: pendingLeave.type,
          leaveRequestStatus: pendingLeave.status,
          workMinutes: actual?.workMinutes ?? 0,
          breakMinutes: actual?.breakMinutes ?? 0,
          overtimeMinutes: actual?.overtimeMinutes ?? 0,
          lateMinutes: actual?.lateMinutes ?? 0,
          workMode: actual?.workMode ?? null,
          isSynthetic: !actual,
        });
        continue;
      }

      const rejectedLeave = userLeaves.find(
        (leave) =>
          leave.status === "REJECTED" &&
          date >= dayStartUtc(leave.startDate) &&
          date <= dayStartUtc(leave.endDate),
      );

      if (actual) {
        timeline.push(
          rejectedLeave
            ? {
                ...actual,
                leaveType: rejectedLeave.type,
                leaveRequestStatus: rejectedLeave.status,
              }
            : actual,
        );
        continue;
      }

      if (isWeekend(date)) {
        timeline.push({
          id: `weekend:${key}`,
          userId: user.id,
          user,
          date,
          status: "WEEKEND",
          workMinutes: 0,
          breakMinutes: 0,
          overtimeMinutes: 0,
          lateMinutes: 0,
          workMode: null,
          isSynthetic: true,
        });
        continue;
      }

      if (dateKey(date) === dateKey(cutoff) && dateKey(cutoff) === dateKey(today)) {
        timeline.push({
          id: `awaiting:${key}`,
          userId: user.id,
          user,
          date,
          status: "AWAITING_ATTENDANCE",
          workMinutes: 0,
          breakMinutes: 0,
          overtimeMinutes: 0,
          lateMinutes: 0,
          workMode: null,
          isSynthetic: true,
        });
        continue;
      }

      timeline.push({
        id: `absent:${key}`,
        userId: user.id,
        user,
        date,
        status: "ABSENT",
        ...(rejectedLeave
          ? {
              leaveType: rejectedLeave.type,
              leaveRequestStatus: rejectedLeave.status,
            }
          : {}),
        workMinutes: 0,
        breakMinutes: 0,
        overtimeMinutes: 0,
        lateMinutes: 0,
        workMode: null,
        isSynthetic: true,
      });
    }
  }

  return timeline.sort((a, b) => {
    const dateOrder = new Date(b.date).getTime() - new Date(a.date).getTime();
    return (
      dateOrder ||
      String(a.user?.name ?? "").localeCompare(String(b.user?.name ?? ""))
    );
  });
}
