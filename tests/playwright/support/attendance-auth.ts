import { expect, type Page } from "@playwright/test";
import {
  attendanceE2EEmail,
  attendanceE2ERoster,
  type AttendanceE2EPersona,
} from "./attendance-month-fixture";

const password = process.env.ATTENDANCE_E2E_PASSWORD;

export async function signInAttendancePersona(
  page: Page,
  personaKey: AttendanceE2EPersona["key"],
  baseURL?: string,
) {
  if (!password) {
    throw new Error("ATTENDANCE_E2E_PASSWORD is required to sign in as an attendance persona.");
  }

  const persona = attendanceE2ERoster.find(({ key }) => key === personaKey);
  if (!persona) {
    throw new Error(`Unknown E2E persona: ${personaKey}`);
  }

  const appURL =
    baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const trustedOrigin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? appURL,
  ).origin;
  const response = await page.request.post(
    new URL("/api/auth/sign-in/email", appURL).toString(),
    {
      data: {
        email: attendanceE2EEmail(persona),
        password,
      },
      headers: { origin: trustedOrigin },
    },
  );

  if (!response.ok()) {
    throw new Error(
      `Attendance E2E sign-in failed for ${persona.key} (HTTP ${response.status()}).`,
    );
  }

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/(?:dashboard|attendance)(?:\/.*)?$/);
  await page.goto("/attendance");
  await expect(page).toHaveURL(/\/attendance(?:\?.*)?$/);
}
