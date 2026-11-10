import { test, expect, hasAuthenticatedState } from "./support/fixtures";

test("analytics overview renders summary values or an empty-data state", async ({
  attendancePage,
  page,
}) => {
  test.skip(!hasAuthenticatedState, "Set ATTENDANCE_E2E_STORAGE_STATE to run authenticated checks.");

  await attendancePage.open();
  await attendancePage.selectTab(
    "Analytics Overview",
    "Analytics",
    /Attendance Intelligence & Analytics/,
  );

  await expect(page.getByText("Punctuality", { exact: true })).toBeVisible();
  await expect(page.getByText("Late Clock-Ins", { exact: true })).toBeVisible();
  await expect(page.getByText("Total Shifts", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox").first()).toBeVisible();
});
