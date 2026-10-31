import assert from "node:assert/strict";
import test from "node:test";
import { buildResolvedAttendanceTimeline } from "../lib/attendance-daily-status";

const employee = {
  id: "staff-1",
  name: "Test Employee",
  email: "staff@example.com",
  employeeId: 12,
  department: "ENGINEERING",
};

const date = (day: number) => new Date(Date.UTC(2026, 9, day));

test("daily timeline resolves actual shifts, approved leave, pending leave, holidays, and absences", () => {
  const timeline = buildResolvedAttendanceTimeline(
    [employee],
    [
      {
        id: "attendance-1",
        userId: employee.id,
        date: date(5),
        status: "PRESENT",
        clockIn: new Date(Date.UTC(2026, 9, 5, 3)),
      },
      {
        id: "attendance-absent-on-leave",
        userId: employee.id,
        date: date(6),
        status: "ABSENT",
      },
      {
        id: "attendance-absent-on-holiday",
        userId: employee.id,
        date: date(8),
        status: "ABSENT",
      },
    ],
    [
      {
        userId: employee.id,
        startDate: date(6),
        endDate: date(6),
        status: "APPROVED",
        type: "CASUAL",
      },
      {
        userId: employee.id,
        startDate: date(7),
        endDate: date(7),
        status: "PENDING",
        type: "SICK",
      },
    ],
    [
      {
        date: date(8),
        name: "Company holiday",
        departments: [],
      },
    ],
    date(5),
    date(9),
    date(10),
  );
  const statusByDate = new Map(
    timeline.map((record) => [record.date.toISOString().slice(0, 10), record.status]),
  );

  assert.equal(statusByDate.get("2026-10-05"), "PRESENT");
  assert.equal(statusByDate.get("2026-10-06"), "ON_LEAVE");
  assert.equal(statusByDate.get("2026-10-07"), "PENDING_LEAVE");
  assert.equal(statusByDate.get("2026-10-08"), "HOLIDAY");
  assert.equal(statusByDate.get("2026-10-09"), "ABSENT");
});

test("actual attendance and holidays take precedence, weekends are not absences, and future days are omitted", () => {
  const timeline = buildResolvedAttendanceTimeline(
    [employee],
    [
      {
        id: "worked-on-holiday",
        userId: employee.id,
        date: date(10),
        status: "PRESENT",
      },
    ],
    [],
    [
      {
        date: date(10),
        name: "Company holiday",
        departments: [],
      },
    ],
    date(9),
    date(12),
    date(11),
  );
  const statusByDate = new Map(
    timeline.map((record) => [record.date.toISOString().slice(0, 10), record.status]),
  );
  const workedHoliday = timeline.find(
    (record) => record.date.toISOString().slice(0, 10) === "2026-10-10",
  );

  assert.equal(statusByDate.get("2026-10-10"), "PRESENT");
  assert.equal(
    workedHoliday && "holidayName" in workedHoliday
      ? workedHoliday.holidayName
      : undefined,
    "Company holiday",
  );
  assert.equal(statusByDate.get("2026-10-11"), "WEEKEND");
  assert.equal(statusByDate.has("2026-10-12"), false);
});

test("holiday dates are scoped to matching departments", () => {
  const timeline = buildResolvedAttendanceTimeline(
    [employee],
    [],
    [],
    [
      {
        date: date(5),
        name: "Sales-only holiday",
        departments: ["SALES"],
      },
    ],
    date(5),
    date(5),
    date(6),
  );

  assert.equal(timeline[0]?.status, "ABSENT");
});

test("today without a shift is awaiting attendance instead of being marked absent", () => {
  const timeline = buildResolvedAttendanceTimeline(
    [employee],
    [],
    [],
    [],
    date(9),
    date(9),
    date(9),
  );

  assert.equal(timeline[0]?.status, "AWAITING_ATTENDANCE");
});

test("absence is not inferred outside an employee's employment dates", () => {
  const timeline = buildResolvedAttendanceTimeline(
    [
      {
        ...employee,
        dateOfJoining: date(7),
        employmentEndedAt: date(8),
        employmentStatus: "INACTIVE",
      },
    ],
    [],
    [],
    [],
    date(5),
    date(9),
    date(10),
  );
  const timelineDates = timeline.map((record) =>
    record.date.toISOString().slice(0, 10),
  );

  assert.deepEqual(timelineDates, ["2026-10-08", "2026-10-07"]);
  assert.ok(timeline.every((record) => record.status === "ABSENT"));
});

test("disabled accounts without an employment end date do not get inferred absences", () => {
  const timeline = buildResolvedAttendanceTimeline(
    [{ ...employee, banned: true }],
    [],
    [],
    [],
    date(5),
    date(5),
    date(6),
  );

  assert.equal(timeline.length, 0);
});
