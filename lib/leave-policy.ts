const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MILLISECONDS_PER_DAY = 86_400_000;

export type MonthlyLeaveBreakdown = Record<string, number>;

export type LeaveDayBreakdown = {
  totalDays: number;
  netLeaveDays: number;
  sundayCount: number;
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
  holidayDateKeys: ReadonlySet<string>,
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
  const sundayCount = countSundays(start, end);
  const holidayCountsByMonth = new Map<string, number>();

  for (const dateKey of holidayDateKeys) {
    const holiday = parseDateOnly(dateKey);
    const timestamp = holiday.getTime();
    if (timestamp < start || timestamp > end || holiday.getUTCDay() === 0) {
      continue;
    }
    const monthKey = dateKey.slice(0, 7);
    holidayCountsByMonth.set(
      monthKey,
      (holidayCountsByMonth.get(monthKey) ?? 0) + 1,
    );
  }

  const holidayCount = [...holidayCountsByMonth.values()].reduce(
    (total, days) => total + days,
    0,
  );
  const breakdown: LeaveDayBreakdown = {
    totalDays,
    netLeaveDays: totalDays - sundayCount - holidayCount,
    sundayCount,
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
      countSundays(monthStart, monthSegmentEnd) -
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

function countSundays(start: number, end: number): number {
  const dayCount = Math.floor((end - start) / MILLISECONDS_PER_DAY) + 1;
  const completeWeeks = Math.floor(dayCount / 7);
  const remainingDays = dayCount % 7;
  let sundays = completeWeeks;
  const firstDay = new Date(start).getUTCDay();

  for (let offset = 0; offset < remainingDays; offset++) {
    if ((firstDay + offset) % 7 === 0) {
      sundays++;
    }
  }

  return sundays;
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
        Number.isSafeInteger(days) &&
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
