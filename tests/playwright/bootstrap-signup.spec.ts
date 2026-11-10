import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL;

function assertDisposableTestDatabase(): void {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must target the disposable Playwright database.");
  }

  const database = new URL(databaseUrl);
  const databaseName = database.pathname.replace(/^\//, "");
  if (
    !["localhost", "127.0.0.1", "::1"].includes(database.hostname) ||
    databaseName !== "crm_attendance_e2e"
  ) {
    throw new Error(
      "Bootstrap signup E2E tests may run only against local crm_attendance_e2e.",
    );
  }
}

test("closes public registration after the first SUPER_ADMIN exists", async ({
  page,
}) => {
  assertDisposableTestDatabase();
  await page.goto("/signup");

  await expect(
    page.getByRole("heading", { name: "Registration is closed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Go to sign in" }),
  ).toHaveAttribute("href", "/signin");
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toHaveCount(0);

  const directSignup = await page.request.post("/api/auth/sign-up/email", {
    data: {
      name: "Blocked Public Signup",
      email: `blocked-public-${randomUUID()}@example.invalid`,
      password: "Playwright-test-password-2026",
    },
  });
  expect(directSignup.status()).toBe(403);

  const bootstrapSignup = await page.request.post("/api/bootstrap-signup", {
    data: {
      name: "Blocked Bootstrap Signup",
      email: `blocked-bootstrap-${randomUUID()}@example.invalid`,
      password: "Playwright-test-password-2026",
    },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(bootstrapSignup.status()).toBe(409);
  expect(await bootstrapSignup.json()).toMatchObject({
    error: expect.stringContaining("already complete"),
  });
});
