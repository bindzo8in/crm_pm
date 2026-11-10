import { test, expect, hasAuthenticatedState, isAttendanceManager } from "./support/fixtures";
import ExcelJS from "exceljs";

test("manager reports support date ranges and expose Excel export", async ({
  attendancePage,
  page,
}) => {
  test.skip(
    !hasAuthenticatedState || !isAttendanceManager,
    "Requires an authenticated admin or HR account; set ATTENDANCE_E2E_MANAGER=true.",
  );

  await attendancePage.open();
  await attendancePage.selectTab(
    "Detailed Reports & Export",
    "Reports",
    /Detailed Attendance Reports/,
  );

  await expect(page.getByRole("button", { name: "Export to Excel (.xlsx)" })).toBeVisible();
  await page.getByRole("button", { name: "Custom Range" }).click();
  const dateInputs = page.locator('input[type="date"]');
  await expect(dateInputs).toHaveCount(2);
  await dateInputs.nth(0).fill("2026-01-01");
  await dateInputs.nth(1).fill("2026-01-31");
  await expect(page.getByText("Detailed Attendance Reports")).toBeVisible();
});

test("manager export is an XLSX workbook containing the filtered record count", async ({
  attendancePage,
  page,
}) => {
  test.skip(
    !hasAuthenticatedState || !isAttendanceManager,
    "Requires an authenticated admin or HR account; set ATTENDANCE_E2E_MANAGER=true.",
  );

  await attendancePage.open();
  await attendancePage.selectTab(
    "Detailed Reports & Export",
    "Reports",
    /Detailed Attendance Reports/,
  );
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();

  const reportSummary = page.getByText(/Showing \d+ of \d+ daily records/);
  await expect(reportSummary).toBeVisible();
  const summaryText = await reportSummary.textContent();
  const totalRecords = Number(summaryText?.match(/of (\d+) daily records/)?.[1]);
  test.skip(totalRecords === 0, "Excel export is disabled because no records match the report.");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export to Excel (.xlsx)" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);

  const filePath = await download.path();
  if (!filePath) throw new Error("Playwright did not provide the exported workbook path.");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const detailedAttendance = workbook.getWorksheet("Detailed Attendance");
  expect(detailedAttendance).toBeDefined();
  expect(detailedAttendance?.getCell("A2").text).toContain(
    `Total Records: ${totalRecords}`,
  );
});
