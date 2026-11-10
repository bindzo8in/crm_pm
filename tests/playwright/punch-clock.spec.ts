import { test, expect, isDedicatedTestEmployee } from "./support/fixtures";

test("unauthenticated clock-out requests are rejected", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const response = await context.request.post(
    new URL("/api/attendance/clock-out", baseURL).toString(),
    { data: {} },
  );

  expect(response.status()).toBe(401);
  await context.close();
});

test("a dedicated employee can clock in and out once and retain the result after refresh", async ({
  attendancePage,
  page,
}) => {
  test.skip(
    !isDedicatedTestEmployee,
    "Requires a dedicated account, ATTENDANCE_E2E_EMPLOYEE_ID, and ATTENDANCE_E2E_ALLOW_MUTATIONS=true.",
  );
  test.skip(
    !process.env.ATTENDANCE_E2E_LOCATION_LAT || !process.env.ATTENDANCE_E2E_LOCATION_LNG,
    "Set mocked office coordinates for this write-path integration test.",
  );

  const latitude = Number(process.env.ATTENDANCE_E2E_LOCATION_LAT);
  const longitude = Number(process.env.ATTENDANCE_E2E_LOCATION_LNG);
  expect(Number.isFinite(latitude) && Number.isFinite(longitude)).toBe(true);

  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude, longitude, accuracy: 10 });
  await attendancePage.open();

  const alreadyRecorded = await page.getByText(
    /Active Shift|Shift Completed|On Break/,
  ).isVisible();
  test.skip(alreadyRecorded, "The dedicated test employee already has attendance recorded today.");

  await expect(attendancePage.clockAction).toHaveAccessibleName(/Clock in/i);
  await attendancePage.clockAction.click();
  await expect(page.getByText("Active Shift")).toBeVisible();
  await expect(attendancePage.clockAction).toHaveAccessibleName("Clock out");

  await attendancePage.clockAction.click();
  await expect(page.getByText("Shift Completed")).toBeVisible();
  await expect(attendancePage.clockAction).toHaveAccessibleName("Clock in");

  await attendancePage.clockAction.click();
  await expect(
    page.getByText(/already have an attendance record for today/i),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Shift Completed")).toBeVisible();
});
