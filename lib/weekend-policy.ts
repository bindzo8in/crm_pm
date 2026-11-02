export const DEFAULT_WEEKEND_DAYS = [0] as const;

export function isWeekendDate(
  date: Date,
  weekendDays: readonly number[] = DEFAULT_WEEKEND_DAYS,
): boolean {
  return weekendDays.includes(date.getUTCDay());
}
