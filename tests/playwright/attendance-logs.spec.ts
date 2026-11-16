import { test, expect, hasAuthenticatedState } from "./support/fixtures";
import { setAttendanceDateRange } from "./support/attendance-page";

test("attendance logs load, support status and date filters, and show empty results", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await attendancePage.open();
  await attendancePage.selectTab("Attendance Logs", "History", /Attendance History/);
  await expect(page.getByRole("columnheader", { name: "Employee" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Clock In" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Clock Out" })).toBeVisible();

  const statusFilter = page.getByRole("combobox").first();
  await page.getByRole("button", { name: "Show attendance filters" }).click();
  await statusFilter.click();
  await page.getByRole("option", { name: "Present", exact: true }).click();

  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 15);
  const futureEnd = new Date(futureStart);
  futureEnd.setDate(futureEnd.getDate() + 1);
  const dateOnly = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  await setAttendanceDateRange(page, dateOnly(futureStart), dateOnly(futureEnd));
  await expect(page.getByText("No attendance records found matching your query.")).toBeVisible();
});

test("attendance logs expose pagination when multiple pages are available", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await attendancePage.open();
  await attendancePage.selectTab("Attendance Logs", "History", /Attendance History/);

  const loadingMessage = page.getByText("Loading attendance records...", {
    exact: true,
  });
  await expect(loadingMessage).toBeVisible();
  await expect(loadingMessage).toBeHidden();

  const logsCountBadge = page.getByText(/^\d+ Logs$/, { exact: true });
  await expect(logsCountBadge).toBeVisible();
  const totalLogs = Number(
    (await logsCountBadge.textContent())?.match(/^(\d+) Logs$/)?.[1],
  );
  test.skip(
    totalLogs <= 10,
    `Pagination requires more than 10 attendance records; found ${totalLogs}.`,
  );

  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(next).toBeVisible();
  await expect(next).toBeEnabled();

  const pageIndicator = page.getByText(/Page \d+ of \d+/);
  await expect(pageIndicator).toBeVisible();
  await next.click();
  await expect(pageIndicator).toContainText("Page 2");

  await expect(loadingMessage).toBeVisible();
  await expect(loadingMessage).toBeHidden();
});
