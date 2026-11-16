import { test, expect, hasAuthenticatedState, isAttendanceManager } from "./support/fixtures";
import {
  attendanceE2EMonthRange,
} from "./support/attendance-month-fixture";
import {
  getAttendanceDailyRecordCount,
  setAttendanceDateRange,
} from "./support/attendance-page";
import ExcelJS from "exceljs";

const monthRange = attendanceE2EMonthRange();

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
  await page.getByRole("button", { name: "Show report filters" }).click();
  await page.getByRole("button", { name: "Custom Range" }).click();
  await setAttendanceDateRange(page, monthRange.start, monthRange.end);
  await expect(page.getByText("Date range", { exact: true }).last()).toBeVisible();
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
  await setAttendanceDateRange(page, monthRange.start, monthRange.end);
  await expect(page.getByRole("button", { name: "Refresh" })).toBeEnabled();

  await expect
    .poll(() => getAttendanceDailyRecordCount(page))
    .toBeGreaterThan(0);
  const totalRecords = await getAttendanceDailyRecordCount(page);
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
