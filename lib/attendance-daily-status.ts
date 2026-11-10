import { DEFAULT_WEEKEND_DAYS, isWeekendDate } from "@/lib/weekend-policy";

export type DailyAttendanceStatus =
  | "PRESENT"
  | "LATE"
  | "HALF_DAY"
  | "ABSENT"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKEND"
  | "AWAITING_ATTENDANCE";

export type LeaveRange = {
  userId: string;
  startDate: Date;
  endDate: Date;
  status: "APPROVED" | "PENDING" | "REJECTED";
  type: string;
  isHalfDay?: boolean;
  halfDayPeriod?: "MORNING" | "AFTERNOON" | null;
};

export type HolidayRange = {
  date: Date;
  name: string;
  departments: string[];
  isHalfDay?: boolean;
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
    additionalDepartments?: string[];
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
  holidayIsHalfDay?: boolean;
  leaveType?: string;
  leaveIsHalfDay?: boolean;
  leaveHalfDayPeriod?: "MORNING" | "AFTERNOON" | null;
  leaveRequestStatus?: string;
  isSynthetic?: boolean;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isScheduledAttendanceShift(
  record: {
    date: Date;
    status: string;
    holidayName?: string;
    holidayIsHalfDay?: boolean;
  },
  weekendDays: readonly number[] = DEFAULT_WEEKEND_DAYS,
  isHoliday = false,
) {
  if (
    (isHoliday && !record.holidayIsHalfDay) ||
    (record.holidayName && !record.holidayIsHalfDay) ||
    record.status === "HOLIDAY" ||
    record.status === "WEEKEND" ||
    isWeekendDate(record.date, weekendDays)
  ) {
    return false;
  }

  return [
    "PRESENT",
    "LATE",
    "HALF_DAY",
    "ABSENT",
    "ON_LEAVE",
    "AWAITING_ATTENDANCE",
  ].includes(
    record.status,
  );
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

export function buildResolvedAttendanceTimeline<TUser extends {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | number | null;
  department: string | null;
  additionalDepartments?: string[];
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
  weekendDays: readonly number[] = DEFAULT_WEEKEND_DAYS,
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
        [user.department, ...(user.additionalDepartments ?? [])].some(
          (department) => department !== null && holiday.departments.includes(department),
        ),
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
      const isWorkedStatus =
        actual &&
        ["PRESENT", "LATE", "HALF_DAY"].includes(actual.status);

      if (isWorkedStatus) {
        timeline.push({
          ...actual,
          ...(holiday
            ? {
                holidayName: holiday.name,
                holidayIsHalfDay: holiday.isHalfDay === true,
              }
            : {}),
          ...(leave
            ? {
                leaveType: leave.type,
                leaveRequestStatus: leave.status,
                leaveIsHalfDay: leave.isHalfDay === true,
                leaveHalfDayPeriod: leave.halfDayPeriod ?? null,
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

      if (holiday?.isHalfDay && !isWeekendDate(date, weekendDays)) {
        timeline.push({
          ...(actual ?? {}),
          id: actual?.id ?? `half-day-holiday:${key}`,
          userId: user.id,
          user,
          date,
          status: leave
            ? "ON_LEAVE"
            : dateKey(date) === dateKey(cutoff) &&
                dateKey(cutoff) === dateKey(today) &&
                !actual
              ? "AWAITING_ATTENDANCE"
              : "HALF_DAY",
          holidayName: holiday.name,
          holidayIsHalfDay: true,
          ...(leave
            ? {
                leaveType: leave.type,
                leaveRequestStatus: leave.status,
                leaveIsHalfDay: leave.isHalfDay === true,
                leaveHalfDayPeriod: leave.halfDayPeriod ?? null,
              }
            : {}),
          workMinutes: actual?.workMinutes ?? 0,
          breakMinutes: actual?.breakMinutes ?? 0,
          overtimeMinutes: actual?.overtimeMinutes ?? 0,
          lateMinutes: actual?.lateMinutes ?? 0,
          workMode: actual?.workMode ?? null,
          isSynthetic: !actual,
        });
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
          holidayIsHalfDay: false,
          workMinutes: actual?.workMinutes ?? 0,
          breakMinutes: actual?.breakMinutes ?? 0,
          overtimeMinutes: actual?.overtimeMinutes ?? 0,
          lateMinutes: actual?.lateMinutes ?? 0,
          workMode: actual?.workMode ?? null,
          isSynthetic: !actual,
        });
        continue;
      }

      if (leave && !isWeekendDate(date, weekendDays)) {
        timeline.push({
          ...(actual ?? {}),
          id: actual?.id ?? `leave:${key}`,
          userId: user.id,
          user,
          date,
          status: "ON_LEAVE",
          leaveType: leave.type,
          leaveRequestStatus: leave.status,
          leaveIsHalfDay: leave.isHalfDay === true,
          leaveHalfDayPeriod: leave.halfDayPeriod ?? null,
          workMinutes: actual?.workMinutes ?? 0,
          breakMinutes: actual?.breakMinutes ?? 0,
          overtimeMinutes: actual?.overtimeMinutes ?? 0,
          lateMinutes: actual?.lateMinutes ?? 0,
          workMode: actual?.workMode ?? null,
          isSynthetic: !actual,
        });
        continue;
      }

      if (actual) {
        timeline.push(actual);
        continue;
      }

      if (isWeekendDate(date, weekendDays)) {
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
