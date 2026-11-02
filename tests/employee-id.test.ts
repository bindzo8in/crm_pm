import assert from "node:assert/strict";
import test from "node:test";
import { formatEmployeeId } from "../lib/employee-id";

test("formats employee IDs with the configured prefix", () => {
  assert.equal(formatEmployeeId(12, "EMP-"), "EMP-012");
  assert.equal(formatEmployeeId(1234, "ACME"), "ACME1234");
});

test("does not add the configured prefix twice", () => {
  assert.equal(formatEmployeeId("EMP-012", "EMP-"), "EMP-012");
});

test("returns null when the employee ID is missing", () => {
  assert.equal(formatEmployeeId(null, "EMP-"), null);
});
