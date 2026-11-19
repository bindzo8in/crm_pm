import { shiftDateOnly } from "@/lib/date";
import { timeToMinutes } from "@/lib/attendance-reminder-policy";

const SCHEDULE_REMINDER_WINDOW_MINUTES = 10;

export function getDueAttendanceScheduleDate(
  currentTime: string,
  scheduledTime: string,
  today: string,
): string | null {
  const currentMinutes = timeToMinutes(currentTime);
  const scheduledMinutes = timeToMinutes(scheduledTime);
  if (currentMinutes === null || scheduledMinutes === null) return null;

  const elapsedMinutes = (currentMinutes - scheduledMinutes + 1440) % 1440;
  if (elapsedMinutes >= SCHEDULE_REMINDER_WINDOW_MINUTES) return null;

  return currentMinutes < scheduledMinutes
    ? shiftDateOnly(today, -1)
    : today;
}
