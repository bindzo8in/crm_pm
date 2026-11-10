import { test, expect, hasAuthenticatedState } from "./support/fixtures";

test("browser notification permission denial is explained without subscribing", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: async () => "denied",
      },
    });
  });
  await attendancePage.open();

  await expect(page.getByRole("heading", { name: "Browser notifications" })).toBeVisible();
  await page.getByRole("button", { name: "Enable notifications" }).click();
  await expect(
    page.getByText(/Browser notifications are blocked for this site/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enable notifications" })).toBeVisible();
});

test("notification controls are visible when the browser supports push", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await attendancePage.open();
  await expect(page.getByRole("heading", { name: "Browser notifications" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Enable notifications|Turn off|Checking\.\.\./ }),
  ).toBeVisible();
});
