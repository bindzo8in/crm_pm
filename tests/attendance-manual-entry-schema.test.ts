import assert from "node:assert/strict";
import test from "node:test";
import { createManualAttendanceSchema } from "../lib/schemas/attendance-schema";

const validEntry = {
  userId: "employee-1",
  clockIn: "2026-11-02T03:30:00.000Z",
  clockOut: "2026-11-02T12:30:00.000Z",
  status: "PRESENT",
  workMode: "OFFICE",
  reason: "Added after correcting a missed punch.",
};

test("manual attendance schema accepts valid entries", () => {
  assert.equal(createManualAttendanceSchema.safeParse(validEntry).success, true);
});

test("manual attendance schema rejects clock out before clock in", () => {
  const result = createManualAttendanceSchema.safeParse({
    ...validEntry,
    clockOut: "2026-11-02T03:00:00.000Z",
  });

  assert.equal(result.success, false);
});

test("manual attendance schema requires a meaningful reason", () => {
  const result = createManualAttendanceSchema.safeParse({
    ...validEntry,
    reason: "   ",
  });

  assert.equal(result.success, false);
});
