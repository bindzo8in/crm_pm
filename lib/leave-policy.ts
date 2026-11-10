import { DEFAULT_WEEKEND_DAYS } from "@/lib/weekend-policy";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MILLISECONDS_PER_DAY = 86_400_000;

export type MonthlyLeaveBreakdown = Record<string, number>;

export type LeaveDayBreakdown = {
  totalDays: number;
  netLeaveDays: number;
  sundayCount: number;
  weekendCount: number;
  holidayCount: number;
  monthlyBreakdown: MonthlyLeaveBreakdown;
};

export function parseDateOnly(value: string): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error("Enter a valid leave date.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Enter a valid leave date.");
  }

  return date;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function calculateLeaveDayBreakdown(
  startDate: Date,
  endDate: Date,
  holidayDateKeys: ReadonlySet<string> | ReadonlyMap<string, number>,
  weekendDays: ReadonlySet<number> = new Set(DEFAULT_WEEKEND_DAYS),
): LeaveDayBreakdown {
  const start = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const end = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  );
  if (end < start) {
    throw new Error("End date cannot be before start date.");
  }

  const totalDays = Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1;
  const sundayCount = weekendDays.has(0) ? countSundays(start, end) : 0;
  const weekendCount = countWeekendDays(start, end, weekendDays);
  const holidayCountsByMonth = new Map<string, number>();

  const holidayEntries: Array<[string, number]> = [];
  for (const holidayEntry of holidayDateKeys) {
    holidayEntries.push(
      typeof holidayEntry === "string"
        ? [holidayEntry, 1]
        : holidayEntry,
    );
  }

  for (const [dateKey, dayValue] of holidayEntries) {
    const holiday = parseDateOnly(dateKey);
    const timestamp = holiday.getTime();
    const weekday = holiday.getUTCDay();
    if (
      timestamp < start ||
      timestamp > end ||
      weekendDays.has(weekday) ||
      (dayValue !== 0.5 && dayValue !== 1)
    ) {
      continue;
    }
    const monthKey = dateKey.slice(0, 7);
    holidayCountsByMonth.set(
      monthKey,
      (holidayCountsByMonth.get(monthKey) ?? 0) + dayValue,
    );
  }

  const holidayCount = [...holidayCountsByMonth.values()].reduce(
    (total, days) => total + days,
    0,
  );
  const breakdown: LeaveDayBreakdown = {
    totalDays,
    netLeaveDays: totalDays - weekendCount - holidayCount,
    sundayCount,
    weekendCount,
    holidayCount,
    monthlyBreakdown: {},
  };

  let monthTimestamp = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    1,
  );
  while (monthTimestamp <= end) {
    const monthEnd = Date.UTC(
      new Date(monthTimestamp).getUTCFullYear(),
      new Date(monthTimestamp).getUTCMonth() + 1,
      0,
    );
    const monthStart = Math.max(start, monthTimestamp);
    const monthSegmentEnd = Math.min(end, monthEnd);
    const daysInSegment =
      Math.floor((monthSegmentEnd - monthStart) / MILLISECONDS_PER_DAY) + 1;
    const monthKey = toDateKey(new Date(monthTimestamp)).slice(0, 7);
    const chargeableDays =
      daysInSegment -
      countWeekendDays(monthStart, monthSegmentEnd, weekendDays) -
      (holidayCountsByMonth.get(monthKey) ?? 0);

    if (chargeableDays > 0) {
      breakdown.monthlyBreakdown[monthKey] = chargeableDays;
    }
    monthTimestamp = Date.UTC(
      new Date(monthTimestamp).getUTCFullYear(),
      new Date(monthTimestamp).getUTCMonth() + 1,
      1,
    );
  }

  return breakdown;
}

export function calculateHalfDayLeaveBreakdown(
  breakdown: LeaveDayBreakdown,
  date: Date,
): LeaveDayBreakdown {
  const isChargeableDate = breakdown.netLeaveDays > 0;
  const month = toDateKey(date).slice(0, 7);
  return {
    ...breakdown,
    netLeaveDays: isChargeableDate ? 0.5 : 0,
    monthlyBreakdown: isChargeableDate ? { [month]: 0.5 } : {},
  };
}

function countSundays(start: number, end: number): number {
  return countWeekdays(start, end, 0);
}

function countWeekendDays(
  start: number,
  end: number,
  weekendDays: ReadonlySet<number>,
): number {
  return [...weekendDays].reduce(
    (total, weekday) => total + countWeekdays(start, end, weekday),
    0,
  );
}

function countWeekdays(start: number, end: number, weekday: number): number {
  const dayCount = Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1;
  const completeWeeks = Math.floor(dayCount / 7);
  const remainingDays = dayCount % 7;
  let count = completeWeeks;
  const firstDay = new Date(start).getUTCDay();

  for (let offset = 0; offset < remainingDays; offset++) {
    if ((firstDay + offset) % 7 === weekday) {
      count++;
    }
  }

  return count;
}

export function parseMonthlyLeaveBreakdown(value: unknown): MonthlyLeaveBreakdown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([month, days]) =>
        MONTH_KEY_PATTERN.test(month) &&
        typeof days === "number" &&
        Number.isFinite(days) &&
        Number.isSafeInteger(days * 2) &&
        days > 0,
    ),
  );
}

export function countAnnualLeaveDaysInMonth(
  breakdowns: readonly unknown[],
  month: string,
): number {
  return breakdowns.reduce<number>((total, breakdown) => {
    return total + (parseMonthlyLeaveBreakdown(breakdown)[month] ?? 0);
  }, 0);
}

export function getAnnualLeaveMonthOverLimit(
  approvedBreakdowns: readonly unknown[],
  requestedBreakdown: unknown,
): string | null {
  const requested = parseMonthlyLeaveBreakdown(requestedBreakdown);
  for (const [month, requestedDays] of Object.entries(requested)) {
    if (countAnnualLeaveDaysInMonth(approvedBreakdowns, month) + requestedDays > 1) {
      return month;
    }
  }
  return null;
}
