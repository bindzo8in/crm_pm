import { isWeekendDate } from "@/lib/weekend-policy";

export function timeToMinutes(time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isWithinAttendanceReminderWindow(
  currentTime: string,
  reminderTime: string,
  shiftStartTime: string,
) {
  const current = timeToMinutes(currentTime);
  const reminder = timeToMinutes(reminderTime);
  const shiftStart = timeToMinutes(shiftStartTime);
  return (
    current !== null &&
    reminder !== null &&
    shiftStart !== null &&
    reminder < shiftStart &&
    current >= reminder &&
    current < shiftStart
  );
}

export function isEligibleForAttendanceReminder(input: {
  date: Date;
  weekendDays: readonly number[];
  department: string | null;
  additionalDepartments?: readonly string[];
  holidayDepartments: readonly (readonly string[])[] | null;
  hasApprovedLeave: boolean;
  hasAttendanceRecord: boolean;
}) {
  const holidayApplies =
    input.holidayDepartments !== null &&
    input.holidayDepartments.some(
      (departments) =>
        departments.length === 0 ||
        [input.department, ...(input.additionalDepartments ?? [])].some(
          (department) => department !== null && departments.includes(department),
        ),
    );

  return (
    !isWeekendDate(input.date, input.weekendDays) &&
    !holidayApplies &&
    !input.hasApprovedLeave &&
    !input.hasAttendanceRecord
  );
}
