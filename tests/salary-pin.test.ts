import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getSalaryPinFailureState,
  isSalaryPinResetExpired,
  isSalaryPinSessionExpired,
  salaryPinSchema,
} from "../lib/schemas/salary-pin-schema";
import {
  createSalaryPinResetToken,
  hashSalaryPin,
  hashSalaryPinResetToken,
  verifySalaryPin,
} from "../lib/salary-pin-crypto";

test("salary PIN validation requires exactly six digits", () => {
  assert.equal(salaryPinSchema.safeParse("042719").success, true);
  assert.equal(salaryPinSchema.safeParse("42719").success, false);
  assert.equal(salaryPinSchema.safeParse("12345a").success, false);
});

test("five failed PIN attempts cause a 15-minute lock", () => {
  const now = new Date("2026-11-03T12:00:00.000Z");
  const result = getSalaryPinFailureState(4, now);

  assert.equal(result.failedAttempts, 5);
  assert.equal(result.lockedUntil?.getTime(), now.getTime() + 15 * 60 * 1000);
});

test("reset links expire at their exact expiry time", () => {
  const expiry = new Date("2026-11-03T12:30:00.000Z");

  assert.equal(
    isSalaryPinResetExpired(expiry, new Date("2026-11-03T12:29:59.999Z")),
    false,
  );
  assert.equal(isSalaryPinResetExpired(expiry, expiry), true);
});

test("salary PIN sessions expire only after five minutes of inactivity", () => {
  const now = 5 * 60 * 1000;

  assert.equal(isSalaryPinSessionExpired(0, now), false);
  assert.equal(isSalaryPinSessionExpired(0, now + 1), true);
  assert.equal(isSalaryPinSessionExpired(now + 1, now), true);
});

test("salary PIN hashes are salted and verify only the matching PIN", async () => {
  const firstHash = await hashSalaryPin("042719");
  const secondHash = await hashSalaryPin("042719");

  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifySalaryPin("042719", firstHash), true);
  assert.equal(await verifySalaryPin("042718", firstHash), false);
  assert.equal(await verifySalaryPin("042719", "invalid"), false);
});

test("reset tokens are random and stored as one-way hashes", () => {
  const firstToken = createSalaryPinResetToken();
  const secondToken = createSalaryPinResetToken();

  assert.notEqual(firstToken, secondToken);
  assert.notEqual(hashSalaryPinResetToken(firstToken), firstToken);
  assert.notEqual(hashSalaryPinResetToken(firstToken), hashSalaryPinResetToken(secondToken));
});
