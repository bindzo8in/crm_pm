import { test, expect, hasAuthenticatedState } from "./support/fixtures";

test("successful mocked geolocation is reported with its accuracy", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({
    latitude: 28.6139,
    longitude: 77.209,
    accuracy: 20,
  });
  await attendancePage.open();

  await expect(page.getByText("GPS precision: within approximately 20 m")).toBeVisible();
  await expect(page.getByText("Excellent", { exact: true })).toBeVisible();
});

for (const scenario of [
  { title: "permission denied", code: 1, expected: /Location permission is blocked/ },
  { title: "GPS unavailable", code: 2, expected: /device location is unavailable/ },
  { title: "location timeout", code: 3, expected: /request timed out/ },
]) {
  test(`shows a retryable location error when ${scenario.title}`, async ({
    attendancePage,
    page,
  }) => {
    test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

    await page.addInitScript((errorCode: number) => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (
            _success: unknown,
            failure: ((error: GeolocationPositionError) => void) | null,
          ) => {
            failure?.({
              code: errorCode,
              message: "Mocked Playwright geolocation failure",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          },
        },
      });
    }, scenario.code);
    await attendancePage.open();

    await expect(page.getByText(scenario.expected)).toBeVisible();
    const retry = attendancePage.locationSection.getByRole("button", {
      name: /^(Retry location|Retry after enabling location)$/i,
    });
    if (await retry.isVisible()) {
      await retry.click();
      await expect(page.getByText(scenario.expected)).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Clock in", exact: true }),
    ).toHaveCount(0);
  });
}

test("a weak mocked GPS signal is rejected instead of being treated as verified", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({
    latitude: 28.6139,
    longitude: 77.209,
    accuracy: 250,
  });
  await attendancePage.open();

  await expect(page.getByText(/GPS signal is not accurate enough/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clock in", exact: true }),
  ).toHaveCount(0);
});
