import assert from "node:assert/strict";
import test from "node:test";
import { salaryPayrollInclusionSchema } from "../lib/schemas/salary-schema";

test("payroll inclusion input requires an employee and an explicit choice", () => {
  assert.deepEqual(
    salaryPayrollInclusionSchema.parse({
      userId: "employee-1",
      includeInPayroll: true,
    }),
    {
      userId: "employee-1",
      includeInPayroll: true,
    },
  );
  assert.equal(
    salaryPayrollInclusionSchema.safeParse({
      userId: "employee-1",
      includeInPayroll: "true",
    }).success,
    false,
  );
  assert.equal(
    salaryPayrollInclusionSchema.safeParse({
      userId: "",
      includeInPayroll: false,
    }).success,
    false,
  );
});
