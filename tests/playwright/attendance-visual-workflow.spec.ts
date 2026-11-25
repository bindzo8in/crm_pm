import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from "@playwright/test";
import ExcelJS from "exceljs";
import {
  getAttendanceE2EOfficeLocation,
  attendanceE2EMonthRange,
  attendanceE2ERoster,
  type AttendanceE2EPersona,
} from "./support/attendance-month-fixture";
import { signInAttendancePersona } from "./support/attendance-auth";
import {
  AttendancePage,
  getAttendanceDailyRecordCount,
  setAttendanceDateRange,
} from "./support/attendance-page";

const password = process.env.ATTENDANCE_E2E_PASSWORD;
const enabled = process.env.ATTENDANCE_E2E_RUN_VISUAL === "true";
const { latitude, longitude } = getAttendanceE2EOfficeLocation();
const staffRoster = attendanceE2ERoster.filter(({ role }) => role === "STAFF");
const monthRange = attendanceE2EMonthRange();

test.use({ storageState: { cookies: [], origins: [] } });

function getTodayInIST(): string {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: "year" | "month" | "day") =>
    dateParts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) {
    throw new Error("Could not determine today's date in Asia/Kolkata.");
  }
  return `${year}-${month}-${day}`;
}

async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

async function openPersona(
  browser: Browser,
  baseURL: string | undefined,
  persona: AttendanceE2EPersona,
  withGeolocation = false,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
    ...(withGeolocation
      ? {
          permissions: ["geolocation"],
          geolocation: { latitude, longitude, accuracy: 10 },
        }
      : {}),
  });
  const page = await context.newPage();

  await signInAttendancePersona(page, persona.key, baseURL);
  return { context, page };
}

async function runStaffPunchFlow(
  browser: Browser,
  baseURL: string | undefined,
  persona: AttendanceE2EPersona,
  testInfo: TestInfo,
) {
  const { context, page } = await openPersona(
    browser,
    baseURL,
    persona,
    true,
  );
  const clockAction = page.getByRole("button", { name: "Clock in" });

  try {
    await test.step(`${persona.department}: ${persona.name} opens Punch Clock`, async () => {
      await expect(page.getByRole("heading", { name: "Ready to start your day?" })).toBeVisible();
      await expect(page.getByText("Not Clocked In")).toBeVisible();
      await expect(clockAction).toBeEnabled();
    });

    await test.step(`${persona.name} clocks in with mocked office GPS`, async () => {
      await clockAction.click();
      await expect(page.getByText("Active Shift")).toBeVisible();
      await expect(page.getByRole("button", { name: "Clock out" })).toBeEnabled();
    });

    await test.step(`${persona.name} clocks out and verifies the saved shift`, async () => {
      const clockOutButton = page.getByRole("button", { name: "Clock out" });
      await expect(page.getByText("Excellent GPS signal")).toBeVisible();
      await expect(clockOutButton).toBeEnabled();
      await clockOutButton.click();
      await expect(page.getByText("Shift Completed")).toBeVisible();
      await page.reload();
      await expect(page.getByText("Shift Completed")).toBeVisible();
      await attachScreenshot(
        page,
        testInfo,
        `${persona.key}-attendance-completed`,
      );
    });

    if (persona.key === "sales") {
      await test.step("The same employee cannot create a duplicate daily attendance record", async () => {
        await page.getByRole("button", { name: "Clock in" }).click();
        await expect(
          page.getByText(/already have an attendance record for today/i),
        ).toBeVisible();
      });
    }
  } finally {
    await context.close();
  }
}

async function setDateRange(page: Page, start: string, end: string) {
  await setAttendanceDateRange(page, start, end);
}

async function selectAttendanceTab(
  page: Page,
  desktopName: string,
  mobileName: string,
  heading: RegExp,
) {
  await new AttendancePage(page).selectTab(desktopName, mobileName, heading);
}

test.describe("Attendance full visual workflow", () => {
  test("staff clock in/out; managers adjust, verify, and export the completed month", async ({
    browser,
    baseURL,
  }, testInfo) => {
    test.setTimeout(180_000);
    test.skip(
      !enabled ||
        !password ||
        process.env.ATTENDANCE_E2E_ALLOW_MUTATIONS !== "true" ||
        !process.env.ATTENDANCE_E2E_LOCATION_LAT ||
        !process.env.ATTENDANCE_E2E_LOCATION_LNG,
      "Enable the visual workflow, use the seeded E2E password, opt into mutations, and configure mocked office coordinates.",
    );

    const appOrigin = new URL(baseURL ?? "http://localhost:3000");
    test.skip(
      !["localhost", "127.0.0.1", "::1", "[::1]"].includes(appOrigin.hostname),
      "The visual attendance workflow writes attendance and is restricted to a local app URL.",
    );
    expect(Number.isFinite(latitude) && latitude >= -90 && latitude <= 90).toBe(true);
    expect(Number.isFinite(longitude) && longitude >= -180 && longitude <= 180).toBe(true);

    const today = getTodayInIST();
    expect(
      monthRange.end < today,
      "The monthly report must use a completed month; current-day punches are tested separately.",
    ).toBe(true);

    await test.step("All department staff record today's attendance in the real Punch Clock UI", async () => {
      for (const persona of staffRoster) {
        await runStaffPunchFlow(browser, baseURL, persona, testInfo);
      }
    });

    let adjustedDate = "";
    const admin = attendanceE2ERoster.find(({ key }) => key === "admin");
    if (!admin) throw new Error("The attendance E2E ADMIN persona is missing.");

    const adminSession = await openPersona(browser, baseURL, admin);
    try {
      const { page } = adminSession;
      await test.step("ADMIN confirms every department clocked in and out today", async () => {
        await selectAttendanceTab(
          page,
          "Attendance Logs",
          "History",
          /Attendance History/,
        );
        const previousDay = new Date(`${today}T00:00:00.000Z`);
        previousDay.setUTCDate(previousDay.getUTCDate() - 1);
        await setDateRange(page, previousDay.toISOString().slice(0, 10), today);

        const logsCount = page.getByText(/^\d+ Logs$/, { exact: true });
        await expect
          .poll(async () => {
            const count = (await logsCount.textContent())?.match(/^\d+/)?.[0];
            const total = count ? Number(count) : Number.NaN;
            return total >= staffRoster.length && total <= 10;
          })
          .toBe(true);
        const totalLogs = Number((await logsCount.textContent())?.match(/^\d+/)?.[0]);
        expect(totalLogs).toBeGreaterThanOrEqual(staffRoster.length);
        const table = page.getByRole("table");
        await expect(table.getByRole("row")).toHaveCount(totalLogs + 1);
        for (const persona of staffRoster) {
          await expect(table).toContainText(persona.name);
        }
        await attachScreenshot(page, testInfo, "admin-todays-all-staff-attendance");
      });

      await test.step("ADMIN generates a completed-month report preview", async () => {
        await selectAttendanceTab(
          page,
          "Detailed Reports & Export",
          "Reports",
          /Detailed Attendance Reports/,
        );
        await setDateRange(page, monthRange.start, monthRange.end);
        const expectedMonthDays = Number(monthRange.end.slice(-2));
        await expect
          .poll(() => getAttendanceDailyRecordCount(page))
          .toBe(expectedMonthDays * attendanceE2ERoster.length);
        await attachScreenshot(page, testInfo, "admin-monthly-report-preview");
      });

      await test.step("ADMIN adjusts a monthly Sales attendance record with an audit reason", async () => {
        await selectAttendanceTab(
          page,
          "Attendance Logs",
          "History",
          /Attendance History/,
        );
        await setDateRange(page, monthRange.start, monthRange.end);
        const departmentFilter = page.getByRole("combobox").nth(1);
        await departmentFilter.click();
        await page.getByRole("option", { name: "Sales", exact: true }).click();

        const salesRow = page
          .getByRole("table")
          .getByRole("row")
          .filter({ hasText: "E2E Sales Employee" })
          .first();
        await expect(salesRow).toBeVisible();
        const dateText = await salesRow.getByRole("cell").nth(1).innerText();
        const recordDate = new Date(`${dateText} UTC`);
        expect(Number.isNaN(recordDate.getTime())).toBe(false);
        adjustedDate = recordDate.toISOString().slice(0, 10);
        const originalClockInText = await salesRow
          .getByRole("cell")
          .nth(2)
          .innerText();

        await salesRow.getByTitle("Regularize / Edit Attendance").click();
        const dialog = page.getByRole("dialog");
        await expect(
          dialog.getByRole("heading", { name: "Regularization Request" }),
        ).toBeVisible();
        await attachScreenshot(page, testInfo, "admin-adjustment-form");

        const clockIn = dialog.locator('input[type="datetime-local"]').first();
        const originalClockInValue = await clockIn.inputValue();
        const correctedClockInDate = new Date(`${originalClockInValue}:00Z`);
        correctedClockInDate.setUTCMinutes(correctedClockInDate.getUTCMinutes() + 1);
        const correctedClockInValue = correctedClockInDate
          .toISOString()
          .slice(0, 16);
        await clockIn.fill(correctedClockInValue);

        await dialog.getByRole("combobox").click();
        await page.getByRole("option", { name: "Present", exact: true }).click();
        const reason = dialog.getByPlaceholder(
          "e.g. System offline / Forgot check-out / Client visit...",
        );
        await reason.fill("Tiny");
        await dialog.getByRole("button", { name: "Save Adjustment" }).click();
        await expect(
          page.getByText(
            "Please provide a clear reason (at least 5 characters).",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(dialog).toBeVisible();

        await reason.fill("E2E visual workflow adjustment");
        await dialog.getByRole("button", { name: "Save Adjustment" }).click();
        await expect(page.getByText("PRESENT", { exact: true }).first()).toBeVisible();
        await expect(salesRow).toContainText("Manual Entry");
        await expect(salesRow.getByRole("cell").nth(2)).not.toHaveText(
          originalClockInText,
        );
        await salesRow.getByTitle("View Audit Trail").click();

        const auditDialog = page.getByRole("dialog");
        await expect(
          auditDialog.getByRole("heading", { name: "Attendance Audit History" }),
        ).toBeVisible();
        await expect(auditDialog.getByText("UPDATE", { exact: true })).toBeVisible();
        await expect(auditDialog).toContainText("E2E visual workflow adjustment");
        await attachScreenshot(page, testInfo, "admin-adjustment-audit-trail");
      });
    } finally {
      await adminSession.context.close();
    }

    const hr = attendanceE2ERoster.find(({ key }) => key === "hr");
    if (!hr) throw new Error("The attendance E2E HR persona is missing.");
    const hrSession = await openPersona(browser, baseURL, hr);
    try {
      const { page } = hrSession;
      await test.step("HR verifies the adjusted monthly record in Detailed Reports", async () => {
        await selectAttendanceTab(
          page,
          "Detailed Reports & Export",
          "Reports",
          /Detailed Attendance Reports/,
        );
        const nextDay = new Date(`${adjustedDate}T00:00:00.000Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        await setDateRange(
          page,
          adjustedDate,
          nextDay.toISOString().slice(0, 10),
        );

        const employeeFilter = page.getByRole("combobox", { name: "Employees" });
        await employeeFilter.click();
        await page.getByPlaceholder("Search employees").fill("E2E Sales Employee");
        await page.getByRole("button", { name: /E2E Sales Employee/ }).click();
        await expect(
          page.getByRole("table").getByText("Edited", { exact: true }).first(),
        ).toBeVisible();
        await expect(page.getByText("E2E Sales Employee").first()).toBeVisible();
        await attachScreenshot(page, testInfo, "hr-verified-adjusted-report");
      });
    } finally {
      await hrSession.context.close();
    }

    const owner = attendanceE2ERoster.find(({ key }) => key === "ceo");
    if (!owner) throw new Error("The attendance E2E organization owner persona is missing.");
    const ownerSession = await openPersona(browser, baseURL, owner);
    try {
      const { page } = ownerSession;
      await test.step("Organization owner reviews and exports the completed monthly report", async () => {
        await selectAttendanceTab(
          page,
          "Detailed Reports & Export",
          "Reports",
          /Detailed Attendance Reports/,
        );
        await setDateRange(page, monthRange.start, monthRange.end);

        const expectedMonthDays = Number(monthRange.end.slice(-2));
        await expect
          .poll(() => getAttendanceDailyRecordCount(page))
          .toBe(expectedMonthDays * attendanceE2ERoster.length);
        await attachScreenshot(page, testInfo, "organization-owner-monthly-report");

        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export to Excel (.xlsx)" }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
        const filePath = await download.path();
        if (!filePath) {
          throw new Error("Playwright did not provide the exported workbook path.");
        }
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet("Detailed Attendance");
        expect(worksheet).toBeDefined();
        expect(worksheet?.getCell("A2").text).toContain(
          `Total Records: ${expectedMonthDays * attendanceE2ERoster.length}`,
        );
      });
    } finally {
      await ownerSession.context.close();
    }
  });
});
