import assert from "node:assert/strict";
import test from "node:test";
import {
  isEligibleForAttendanceReminder,
  isWithinAttendanceReminderWindow,
  timeToMinutes,
} from "../lib/attendance-reminder-policy";

const monday = new Date("2026-11-02T00:00:00.000Z");
const sunday = new Date("2026-11-01T00:00:00.000Z");

test("reminders only run from the configured time until shift start", () => {
  assert.equal(isWithinAttendanceReminderWindow("08:30", "08:30", "09:00"), true);
  assert.equal(isWithinAttendanceReminderWindow("08:59", "08:30", "09:00"), true);
  assert.equal(isWithinAttendanceReminderWindow("08:29", "08:30", "09:00"), false);
  assert.equal(isWithinAttendanceReminderWindow("09:00", "08:30", "09:00"), false);
  assert.equal(isWithinAttendanceReminderWindow("08:30", "09:00", "08:30"), false);
  assert.equal(timeToMinutes("25:00"), null);
});

test("reminders skip weekends, applicable holidays, approved leave, and checked-in employees", () => {
  const eligible = {
    date: monday,
    weekendDays: [0],
    department: "HR",
    holidayDepartments: null,
    hasApprovedLeave: false,
    hasAttendanceRecord: false,
  };
  assert.equal(isEligibleForAttendanceReminder(eligible), true);
  assert.equal(
    isEligibleForAttendanceReminder({ ...eligible, date: sunday }),
    false,
  );
  assert.equal(
    isEligibleForAttendanceReminder({
      ...eligible,
      holidayDepartments: [[]],
    }),
    false,
  );
  assert.equal(
    isEligibleForAttendanceReminder({
      ...eligible,
      holidayDepartments: [["HR"]],
    }),
    false,
  );
  assert.equal(
    isEligibleForAttendanceReminder({
      ...eligible,
      holidayDepartments: [["SALES"]],
    }),
    true,
  );
  assert.equal(
    isEligibleForAttendanceReminder({
      ...eligible,
      additionalDepartments: ["SALES"],
      holidayDepartments: [["SALES"]],
    }),
    false,
  );
  assert.equal(
    isEligibleForAttendanceReminder({ ...eligible, hasApprovedLeave: true }),
    false,
  );
  assert.equal(
    isEligibleForAttendanceReminder({ ...eligible, hasAttendanceRecord: true }),
    false,
  );
});
