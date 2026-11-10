import assert from "node:assert/strict";
import test from "node:test";
import {
  dateOnlyAtCompanyMidnight,
  formatInIST,
  getPreviousMonthInCompanyTimezone,
  shiftDateOnly,
} from "../lib/date";

test("company date boundaries preserve the selected calendar date", () => {
  const date = dateOnlyAtCompanyMidnight("2026-11-05");

  assert.equal(date.toISOString(), "2026-11-04T18:30:00.000Z");
  assert.equal(formatInIST(date, "yyyy-MM-dd"), "2026-11-05");
});

test("timestamp display stays fixed to the company timezone", () => {
  assert.equal(
    formatInIST(new Date("2026-11-10T11:37:28.925Z"), "dd/MM/yyyy"),
    "10/11/2026",
  );
});

test("date-only shifts cross month and leap-day boundaries correctly", () => {
  assert.equal(shiftDateOnly("2026-11-05", 1), "2026-11-06");
  assert.equal(shiftDateOnly("2024-03-01", -1), "2024-02-29");
});

test("monthly payroll month is based on the India calendar date", () => {
  assert.deepEqual(
    getPreviousMonthInCompanyTimezone(new Date("2026-10-31T21:00:00.000Z")),
    { month: 10, year: 2026 },
  );
  assert.deepEqual(
    getPreviousMonthInCompanyTimezone(new Date("2026-11-01T00:00:00.000Z")),
    { month: 10, year: 2026 },
  );
});
