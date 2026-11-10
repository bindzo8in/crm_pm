import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import {
  attendanceE2EEmail,
  attendanceE2EMonthRange,
  attendanceE2ERoster,
} from "./support/attendance-month-fixture";
import { AttendancePage } from "./support/attendance-page";

const monthRange = attendanceE2EMonthRange();
const password = process.env.ATTENDANCE_E2E_PASSWORD;
const enabled = process.env.ATTENDANCE_E2E_RUN_MONTHLY === "true";

test.use({ storageState: { cookies: [], origins: [] } });

async function signInAs(
  page: import("@playwright/test").Page,
  personaKey: (typeof attendanceE2ERoster)[number]["key"],
) {
  test.skip(
    !enabled || !password,
    "Set ATTENDANCE_E2E_RUN_MONTHLY=true and ATTENDANCE_E2E_PASSWORD after seeding the isolated E2E database.",
  );

  const persona = attendanceE2ERoster.find(({ key }) => key === personaKey);
  if (!persona) throw new Error(`Unknown E2E persona: ${personaKey}`);

  await page.goto(`/signin?callbackUrl=${encodeURIComponent("/attendance")}`);
  await page.getByLabel("Email").fill(attendanceE2EEmail(persona));
  await page.getByLabel("Password *").fill(password ?? "");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page,
    `Sign-in failed for ${persona.key}. Re-run pnpm seed:e2e:attendance with this exact ATTENDANCE_E2E_PASSWORD, and ensure the app uses the same isolated database.`,
  ).toHaveURL(/\/attendance(?:\?.*)?$/);
}

async function openAttendanceTab(
  page: import("@playwright/test").Page,
  tab: string,
  heading: RegExp,
) {
  const mobileTab =
    tab === "Attendance Logs"
      ? "History"
      : tab === "Analytics Overview"
        ? "Analytics"
        : "Reports";
  await new AttendancePage(page).selectTab(tab, mobileTab, heading);
}

test.describe("one-company, full-month attendance workflow", () => {
  test("SUPER_ADMIN can review the seeded monthly analytics across the company", async ({
    page,
  }) => {
    await signInAs(page, "ceo");
    await openAttendanceTab(page, "Analytics Overview", /Attendance Intelligence & Analytics/);

    await page.getByRole("button", { name: "Custom", exact: true }).click();
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
    await dateInputs.nth(0).fill(monthRange.start);
    await dateInputs.nth(1).fill(monthRange.end);

    await expect(
      page.getByText("Aggregating attendance telemetry & analytics...", { exact: true }),
    ).toBeHidden();
    await expect(page.getByText("Late Clock-Ins", { exact: true })).toBeVisible();
    await expect(page.getByText("Half Days", { exact: true })).toBeVisible();

    const lateMetric = page
      .getByText("Late Clock-Ins", { exact: true })
      .locator("xpath=../..");
    const halfDayMetric = page
      .getByText("Half Days", { exact: true })
      .locator("xpath=../..");
    await expect(lateMetric.getByText("1", { exact: true })).toBeVisible();
    await expect(halfDayMetric.getByText("1", { exact: true })).toBeVisible();
    await expect(halfDayMetric).toContainText("1 absent");
  });

  test("ADMIN can view all departments' monthly records and use attendance pagination", async ({
    page,
  }) => {
    await signInAs(page, "admin");
    await openAttendanceTab(page, "Attendance Logs", /Attendance History/);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(monthRange.start);
    await dateInputs.nth(1).fill(monthRange.end);
    const countBadge = page.getByText(/^\d+ Logs$/, { exact: true });
    await expect
      .poll(
        async () =>
          Number((await countBadge.textContent())?.match(/^\d+/)?.[0] ?? 0),
      )
      .toBeGreaterThan(10);
    const count = Number((await countBadge.textContent())?.match(/^\d+/)?.[0]);
    expect(count).toBeGreaterThan(10);

    await expect(page.getByRole("table").getByRole("row").nth(1)).toBeVisible();
    const next = page.getByRole("button", { name: "Next", exact: true });
    await expect(next).toBeEnabled();
    const pageIndicator = page.getByText(/Page \d+ of \d+/);
    await next.click();
    await expect(pageIndicator).toContainText("Page 2");
  });

  test("HR STAFF can access manager-level attendance reports", async ({ page }) => {
    await signInAs(page, "hr");
    await openAttendanceTab(page, "Detailed Reports & Export", /Detailed Attendance Reports/);

    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs).toHaveCount(2);
    await dateInputs.nth(0).fill(monthRange.start);
    await dateInputs.nth(1).fill(monthRange.end);
    await expect(page.getByText(/Showing \d+ of \d+ daily records/)).toBeVisible();

    const employeeFilter = page.getByRole("combobox").nth(1);
    await employeeFilter.click();
    await expect(
      page.getByRole("option", { name: /E2E (Sales|Development|Design|SEO|Marketing|HR|Operations) Employee/ }).first(),
    ).toBeVisible();
  });

  test("STAFF attendance history is limited to that employee's seeded records", async ({
    page,
  }) => {
    await signInAs(page, "sales");
    await openAttendanceTab(page, "Attendance Logs", /Attendance History/);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(monthRange.start);
    await dateInputs.nth(1).fill(monthRange.end);

    const logs = page.getByText(/^\d+ Logs$/, { exact: true });
    await expect(logs).toHaveText(/^[1-9]\d* Logs$/);
    const logCount = Number((await logs.textContent())?.match(/^\d+/)?.[0]);
    expect(logCount).toBeGreaterThan(0);

    const table = page.getByRole("table");
    await expect(table).toContainText("E2E Sales Employee");
    await expect(table).not.toContainText("E2E Founder CEO");
  });

  test("SUPER_ADMIN export matches the selected employee and month", async ({ page }) => {
    await signInAs(page, "ceo");
    await openAttendanceTab(page, "Detailed Reports & Export", /Detailed Attendance Reports/);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(monthRange.start);
    await dateInputs.nth(1).fill(monthRange.end);

    const employeeFilter = page.getByRole("combobox").nth(1);
    await employeeFilter.click();
    await page.getByRole("option", { name: /E2E Sales Employee/ }).click();

    const summary = page.getByText(/Showing \d+ of \d+ daily records/);
    const expectedMonthDays = Number(monthRange.end.slice(-2));
    await expect(summary).toContainText(
      `of ${expectedMonthDays} daily records`,
    );
    const totalRecords = Number(
      (await summary.textContent())?.match(/of (\d+) daily records/)?.[1],
    );
    expect(totalRecords).toBe(expectedMonthDays);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export to Excel (.xlsx)" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);

    const filePath = await download.path();
    if (!filePath) throw new Error("Playwright did not provide the exported workbook path.");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet("Detailed Attendance");
    expect(worksheet?.getCell("A2").text).toContain(`Total Records: ${totalRecords}`);

    const exportedNames: string[] = [];
    worksheet?.eachRow((row, rowNumber) => {
      if (rowNumber > 3) exportedNames.push(row.getCell(4).text);
    });
    expect(exportedNames).toContain("E2E Sales Employee");
    expect(exportedNames).not.toContain("E2E Founder CEO");
  });
});
