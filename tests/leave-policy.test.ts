import assert from "node:assert/strict";
import test from "node:test";
import { Department, UserRole } from "../app/generated/prisma/enums";
import { isLeaveManager } from "../lib/leave-permissions";
import { hasWorkspaceAccess } from "../lib/workspace-access";
import {
  calculateLeaveDayBreakdown,
  getAnnualLeaveMonthOverLimit,
  parseDateOnly,
  parseMonthlyLeaveBreakdown,
} from "../lib/leave-policy";

test("Saturdays count; Sundays and company holidays are excluded", () => {
  const result = calculateLeaveDayBreakdown(
    parseDateOnly("2026-08-01"),
    parseDateOnly("2026-08-04"),
    new Set(["2026-08-03"]),
  );

  assert.deepEqual(result, {
    totalDays: 4,
    netLeaveDays: 2,
    sundayCount: 1,
    holidayCount: 1,
    monthlyBreakdown: { "2026-08": 2 },
  });
});

test("A holiday that falls on Sunday is counted once as a Sunday", () => {
  const result = calculateLeaveDayBreakdown(
    parseDateOnly("2026-08-02"),
    parseDateOnly("2026-08-02"),
    new Set(["2026-08-02"]),
  );

  assert.equal(result.sundayCount, 1);
  assert.equal(result.holidayCount, 0);
  assert.equal(result.netLeaveDays, 0);
});

test("Chargeable leave is allocated to each calendar month", () => {
  const result = calculateLeaveDayBreakdown(
    parseDateOnly("2026-08-31"),
    parseDateOnly("2026-09-02"),
    new Set(),
  );

  assert.deepEqual(result.monthlyBreakdown, {
    "2026-08": 1,
    "2026-09": 2,
  });
});

test("Annual Leave approval enforces one approved paid day per month", () => {
  const approved = [{ "2026-08": 1 }];

  assert.equal(
    getAnnualLeaveMonthOverLimit(approved, { "2026-08": 1 }),
    "2026-08",
  );
  assert.equal(
    getAnnualLeaveMonthOverLimit(approved, { "2026-09": 1 }),
    null,
  );
});

test("Malformed saved month allocations do not consume entitlement", () => {
  assert.deepEqual(
    parseMonthlyLeaveBreakdown({
      "2026-08": 1,
      "2026-13": 5,
      "2026-09": -1,
      "invalid": 2,
    }),
    { "2026-08": 1 },
  );
});

test("HR staff, Admin, and Super Admin can review any staff request", () => {
  assert.equal(isLeaveManager({ role: UserRole.STAFF, department: Department.HR }), true);
  assert.equal(isLeaveManager({ role: UserRole.ADMIN, department: null }), true);
  assert.equal(isLeaveManager({ role: UserRole.SUPER_ADMIN, department: null }), true);
  assert.equal(isLeaveManager({ role: UserRole.STAFF, department: Department.SALES }), false);
});

test("Staff require an assigned department before accessing workspace modules", () => {
  assert.equal(hasWorkspaceAccess({ role: UserRole.STAFF, department: null }), false);
  assert.equal(hasWorkspaceAccess({ role: UserRole.STAFF, department: "unknown" }), false);
  assert.equal(hasWorkspaceAccess({ role: UserRole.STAFF, department: Department.HR }), true);
  assert.equal(hasWorkspaceAccess({ role: UserRole.ADMIN, department: null }), true);
  assert.equal(hasWorkspaceAccess({ role: "UNKNOWN", department: Department.HR }), false);
});
