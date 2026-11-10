import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { test as base, expect } from "@playwright/test";
import { AttendancePage } from "./attendance-page";

const statePath = process.env.ATTENDANCE_E2E_STORAGE_STATE;

export const hasAuthenticatedState = Boolean(
  statePath && existsSync(resolve(statePath)),
);
export const isDedicatedTestEmployee = Boolean(
  hasAuthenticatedState &&
    process.env.ATTENDANCE_E2E_EMPLOYEE_ID?.trim() &&
    process.env.ATTENDANCE_E2E_ALLOW_MUTATIONS === "true",
);
export const isAttendanceManager = process.env.ATTENDANCE_E2E_MANAGER === "true";

type AttendanceFixtures = {
  attendancePage: AttendancePage;
};

export const test = base.extend<AttendanceFixtures>({
  attendancePage: async ({ page }, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a Playwright fixture lifecycle callback.
    await use(new AttendancePage(page));
  },
});

export { expect };
