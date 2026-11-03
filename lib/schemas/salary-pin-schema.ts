import { z } from "zod";

export const salaryPinInactivityMs = 5 * 60 * 1000;

export const salaryPinSchema = z
  .string()
  .regex(/^\d{6}$/, "Enter a six-digit PIN.");

export const salaryPinResetTokenSchema = z
  .string()
  .min(32)
  .max(256);

export function getSalaryPinFailureState(
  failedAttempts: number,
  now: Date,
) {
  const nextFailedAttempts = failedAttempts + 1;
  const isLocked = nextFailedAttempts >= 5;

  return {
    failedAttempts: nextFailedAttempts,
    lockedUntil: isLocked ? new Date(now.getTime() + 15 * 60 * 1000) : null,
  };
}

export function isSalaryPinResetExpired(expiresAt: Date, now: Date) {
  return expiresAt.getTime() <= now.getTime();
}

export function isSalaryPinSessionExpired(lastActivityAt: number, now: number) {
  const elapsed = now - lastActivityAt;
  return elapsed < 0 || elapsed > salaryPinInactivityMs;
}
