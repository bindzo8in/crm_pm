import { test, expect, hasAuthenticatedState, isAttendanceManager } from "./support/fixtures";

test("manager can inspect shift rules and browser rejects malformed time values", async ({
  attendancePage,
  page,
}) => {
  test.skip(
    !hasAuthenticatedState || !isAttendanceManager,
    "Requires an authenticated admin or HR account; set ATTENDANCE_E2E_MANAGER=true.",
  );

  await attendancePage.open();
  await page.getByRole("button", { name: /Shift Rules|Set up shift rules/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Shift schedule and grace rules")).toBeVisible();

  const start = page.getByPlaceholder("09:00");
  await expect(start).toBeVisible();
  await start.fill("not-a-time");
  await expect(start).toHaveValue("not-a-time");
  await page.getByRole("button", { name: "Save Settings" }).click();
  await expect(page.getByText("Format must be HH:mm")).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
});
