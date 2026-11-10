import assert from "node:assert/strict";
import test from "node:test";
import {
  Department,
  IssueReportStatus,
  UserRole,
} from "../app/generated/prisma/enums";
import { canManageIssueReports } from "../lib/permissions";
import {
  createIssueReportSchema,
  updateIssueReportSchema,
} from "../lib/schemas/issue-report";
import { canAccessRoute } from "../lib/route-permissions";

test("issue reporting is available to every staff member, including those without a department", () => {
  assert.equal(canAccessRoute("/dashboard/issues", UserRole.STAFF, null), true);
  assert.equal(canAccessRoute("/dashboard/issues", UserRole.STAFF, Department.DEVELOPMENT), true);
});

test("only administrators and HR staff can review team reports", () => {
  assert.equal(canManageIssueReports({ role: UserRole.SUPER_ADMIN, department: null }), true);
  assert.equal(canManageIssueReports({ role: UserRole.ADMIN, department: null }), true);
  assert.equal(canManageIssueReports({ role: UserRole.STAFF, department: Department.HR }), true);
  assert.equal(canManageIssueReports({ role: UserRole.STAFF, department: Department.SALES }), false);
  assert.equal(canManageIssueReports({ role: UserRole.STAFF, department: null }), false);
});

test("issue report submission validates and trims user input", () => {
  const parsed = createIssueReportSchema.parse({
    type: "ISSUE",
    title: "  Login page is unavailable  ",
    description: "  The sign-in page shows an error when I submit valid credentials.  ",
  });

  assert.equal(parsed.title, "Login page is unavailable");
  assert.equal(parsed.description, "The sign-in page shows an error when I submit valid credentials.");
  assert.equal(createIssueReportSchema.safeParse({
    type: "OTHER",
    title: "No",
    description: "Too short",
  }).success, false);
});

test("review updates accept only valid report statuses and bounded responses", () => {
  assert.equal(updateIssueReportSchema.parse({
    id: "report-id",
    status: IssueReportStatus.IN_REVIEW,
    response: "We are looking into this.",
  }).status, IssueReportStatus.IN_REVIEW);
  assert.equal(updateIssueReportSchema.safeParse({
    id: "report-id",
    status: "UNKNOWN",
    response: "",
  }).success, false);
});
