import assert from "node:assert/strict";
import test from "node:test";
import { requiresSalarySlipReview } from "../lib/salary-review-policy";

test("routine generated salary does not require approval", () => {
  assert.equal(
    requiresSalarySlipReview({
      status: "GENERATED",
      medicalReimbursement: "0",
      extraEarnings: "0",
      extraDeductions: "0",
    }),
    false,
  );
});

test("manual earnings, deductions, and reimbursements require approval", () => {
  for (const adjustment of [
    { extraEarnings: 2500 },
    { extraDeductions: 500 },
    { medicalReimbursement: 800 },
    { adjustments: [{ removedAt: null }] },
  ]) {
    assert.equal(
      requiresSalarySlipReview({ status: "GENERATED", ...adjustment }),
      true,
    );
  }
});

test("removed adjustments and approved slips do not require further approval", () => {
  assert.equal(
    requiresSalarySlipReview({
      status: "GENERATED",
      adjustments: [{ removedAt: new Date() }],
    }),
    false,
  );
  assert.equal(
    requiresSalarySlipReview({
      status: "GENERATED",
      approvedAt: new Date(),
      extraEarnings: 500,
    }),
    false,
  );
});
