import assert from "node:assert/strict";
import test from "node:test";
import { Department } from "@/app/generated/prisma/enums";
import {
  getDepartmentMemberships,
  normalizeAdditionalDepartments,
} from "@/lib/departments";

test("department memberships include primary and deduplicate additions", () => {
  assert.deepEqual(
    getDepartmentMemberships({
      department: Department.SALES,
      additionalDepartments: [Department.HR, Department.SALES],
    }),
    [Department.SALES, Department.HR],
  );
});

test("additional departments exclude the primary and duplicate values", () => {
  assert.deepEqual(
    normalizeAdditionalDepartments(Department.SALES, [
      Department.SALES,
      Department.HR,
      Department.HR,
    ]),
    [Department.HR],
  );
});
