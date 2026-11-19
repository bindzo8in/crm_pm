import assert from "node:assert/strict";
import test from "node:test";
import { getDueAttendanceScheduleDate } from "../lib/attendance-schedule-reminder-policy";

test("scheduled reminders are due for ten minutes starting at the configured time", () => {
  assert.equal(
    getDueAttendanceScheduleDate("09:00", "09:00", "2026-11-17"),
    "2026-11-17",
  );
  assert.equal(
    getDueAttendanceScheduleDate("09:09", "09:00", "2026-11-17"),
    "2026-11-17",
  );
  assert.equal(
    getDueAttendanceScheduleDate("09:10", "09:00", "2026-11-17"),
    null,
  );
  assert.equal(
    getDueAttendanceScheduleDate("08:59", "09:00", "2026-11-17"),
    null,
  );
});

test("scheduled reminders just after midnight belong to the previous shift date", () => {
  assert.equal(
    getDueAttendanceScheduleDate("00:04", "23:58", "2026-11-17"),
    "2026-11-16",
  );
  assert.equal(
    getDueAttendanceScheduleDate("00:09", "23:58", "2026-11-17"),
    null,
  );
});

test("invalid schedule times are not due", () => {
  assert.equal(
    getDueAttendanceScheduleDate("25:00", "09:00", "2026-11-17"),
    null,
  );
  assert.equal(
    getDueAttendanceScheduleDate("09:00", "invalid", "2026-11-17"),
    null,
  );
});
