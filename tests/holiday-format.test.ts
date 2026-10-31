import assert from "node:assert/strict";
import test from "node:test";
import { formatHolidayDateRange } from "../lib/holiday-format";

test("formats a single holiday date", () => {
  assert.equal(
    formatHolidayDateRange(
      new Date("2027-01-01T00:00:00.000Z"),
      new Date("2027-01-01T00:00:00.000Z"),
    ),
    "1 Jan 2027",
  );
});

test("formats a holiday range within one month", () => {
  assert.equal(
    formatHolidayDateRange(
      new Date("2027-01-01T00:00:00.000Z"),
      new Date("2027-01-03T00:00:00.000Z"),
    ),
    "1–3 Jan 2027",
  );
});

test("formats a holiday range across calendar years", () => {
  assert.equal(
    formatHolidayDateRange(
      new Date("2026-12-31T00:00:00.000Z"),
      new Date("2027-01-02T00:00:00.000Z"),
    ),
    "31 Dec 2026–2 Jan 2027",
  );
});
