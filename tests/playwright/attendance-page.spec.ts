import { test, expect, hasAuthenticatedState } from "./support/fixtures";

test("unauthenticated users are redirected to sign in", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();

  await page.goto(new URL("/attendance", baseURL).toString());
  await expect(page).toHaveURL(/\/signin(?:\?|$)/);

  await context.close();
});

test("attendance page loads the default Punch Clock tab and its key sections", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  const pageErrors: string[] = [];
  const failedApiRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (request.url().includes("/api/")) failedApiRequests.push(request.url());
  });

  await attendancePage.open();

  await expect(attendancePage.punchClockTab).toBeVisible();
  await expect(page.getByRole("button", { name: "Attendance Logs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Analytics Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Browser notifications" })).toBeVisible();
  await expect(page.getByText(/Expected shift:/)).toBeVisible();
  await expect(page.getByText(/Not Clocked In|Active Shift|Shift Completed|On Break/)).toBeVisible();
  await expect(page.getByText("Ready to start your day?")).toBeVisible();
  expect(pageErrors).toEqual([]);
  expect(failedApiRequests).toEqual([]);
});

test("attendance page remains usable without horizontal overflow at target viewport sizes", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  const viewports = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 375, height: 812 },
  ];

  await attendancePage.open();

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.getByText("Browser notifications")).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

    if (viewport.width < 768) {
      await page.getByRole("button", { name: "History", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Attendance History" })).toBeVisible();
      await page.getByRole("button", { name: "Punch", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Your workday" })).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: "Attendance Logs" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Punch Clock" })).toBeVisible();
    }
  }
});

test("dashboard sidebar active links hydrate without pathname mismatch warnings", async ({
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  const hydrationMessages: string[] = [];
  page.on("console", (message) => {
    if (/hydration|server rendered html didn't match|didn't match the client/i.test(message.text())) {
      hydrationMessages.push(message.text());
    }
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(hydrationMessages).toEqual([]);
});
