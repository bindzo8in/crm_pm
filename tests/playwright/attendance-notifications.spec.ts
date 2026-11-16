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
  await page.getByRole("button", { name: "Open attendance settings" }).click();

  await expect(page.getByRole("heading", { name: "Browser alerts" })).toBeVisible();
  await page.getByRole("button", { name: "Enable browser notifications" }).click();
  await expect(
    page.getByText(/Browser notifications are blocked for this site/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Enable browser notifications" }),
  ).toBeVisible();
});

test("notification controls are visible when the browser supports push", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await attendancePage.open();
  await page.getByRole("button", { name: "Open attendance settings" }).click();
  await expect(page.getByRole("heading", { name: "Browser alerts" })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Enable browser notifications|Turn off browser notifications|Browser notifications are not supported/,
    }),
  ).toBeVisible();
});
