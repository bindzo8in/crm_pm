import { test, expect } from "@playwright/test";

test("attendance API rejects an unknown operation with HTTP 400", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const response = await context.request.get(
    new URL("/api/attendance/unknown-operation", baseURL).toString(),
  );

  expect(response.status()).toBe(400);
  const body: { success: boolean; error: string } = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toMatch(/Invalid GET action/);
  await context.close();
});

test("attendance logs API requires an authenticated session", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const response = await context.request.post(
    new URL("/api/attendance/logs", baseURL).toString(),
    { data: {} },
  );

  expect(response.status()).toBe(401);
  const body: { success: boolean; error: string } = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toBe("Unauthorized");
  await context.close();
});

test("today attendance API requires an authenticated session", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const response = await context.request.get(
    new URL("/api/attendance/today", baseURL).toString(),
  );

  expect(response.status()).toBe(401);
  const body: { success: boolean; error: string } = await response.json();
  expect(body).toMatchObject({ success: false, error: "Unauthorized" });
  await context.close();
});
