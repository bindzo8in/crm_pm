import assert from "node:assert/strict";
import test from "node:test";
import { calculateMonthlySalary, countWorkingDays } from "../lib/salary-calculation";

test("one approved leave day is paid and the second is unpaid", () => {
  const result = calculateMonthlySalary({
    grossBase: 60_000,
    totalDaysInMonth: 30,
    presentDays: 20,
    halfDays: 0,
    absentDays: 0,
    chargeableLeaveDays: 2,
  });

  assert.equal(result.paidLeaveConsumed, 1);
  assert.equal(result.unpaidLeaves, 1);
  assert.equal(result.lopDays, 1);
  assert.equal(result.paidDays, 29);
  assert.equal(result.absentDeduction, 2_000);
  assert.equal(result.netSalary, 58_000);
});

test("half days contribute a half-day LOP deduction", () => {
  const result = calculateMonthlySalary({
    grossBase: 30_000,
    totalDaysInMonth: 30,
    presentDays: 18,
    halfDays: 2,
    absentDays: 1,
    chargeableLeaveDays: 0,
  });

  assert.equal(result.lopDays, 2);
  assert.equal(result.absentDeduction, 2_000);
  assert.equal(result.paidDays, 28);
});

test("salary totals reconcile earnings and deductions", () => {
  const result = calculateMonthlySalary({
    grossBase: 50_000,
    totalDaysInMonth: 31,
    presentDays: 20,
    halfDays: 1,
    absentDays: 2,
    chargeableLeaveDays: 0,
    customEarnings: 1_000,
    fixedDeductions: 3_000,
    customDeductions: 500,
  });

  assert.equal(result.totalEarnings, 46_967.74193548387);
  assert.equal(result.totalDeductions, 3_500);
  assert.equal(result.netSalary, 43_467.74193548387);
});

test("leave duration excludes weekends and company holidays", () => {
  const holidays = new Set(["2026-09-08"]);
  const duration = countWorkingDays(
    new Date("2026-09-21T00:00:00.000Z"),
    new Date("2026-09-22T00:00:00.000Z"),
    holidays,
  );

  assert.equal(duration, 2);
});
