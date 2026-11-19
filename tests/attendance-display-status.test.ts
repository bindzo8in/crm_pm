import assert from "node:assert/strict";
import test from "node:test";

import { isAttendanceInProgress } from "../lib/attendance-display-status";

test("open worked shifts are displayed as in progress", () => {
  assert.equal(
    isAttendanceInProgress({
      status: "PRESENT",
      clockIn: new Date("2026-11-17T09:00:00Z"),
      clockOut: null,
    }),
    true,
  );
});

test("closed, absent, synthetic, and auto-closed records are not in progress", () => {
  const clockIn = new Date("2026-11-17T09:00:00Z");

  assert.equal(
    isAttendanceInProgress({ status: "PRESENT", clockIn, clockOut: new Date() }),
    false,
  );
  assert.equal(isAttendanceInProgress({ status: "PRESENT", clockOut: null }), false);
  assert.equal(isAttendanceInProgress({ status: "ABSENT", clockOut: null }), false);
  assert.equal(
    isAttendanceInProgress({
      status: "PRESENT",
      clockIn,
      clockOut: null,
      isAutoCheckedOut: true,
    }),
    false,
  );
  assert.equal(
    isAttendanceInProgress({
      status: "PRESENT",
      clockIn,
      clockOut: null,
      isSynthetic: true,
    }),
    false,
  );
});
