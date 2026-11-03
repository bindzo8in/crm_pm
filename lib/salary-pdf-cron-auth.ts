import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const TOKEN_TTL_MS = 2 * 60 * 1000;

function sign(slipId: string, expiresAt: number, secret: string) {
  return createHmac("sha256", secret)
    .update(`salary-pdf:${slipId}:${expiresAt}`)
    .digest("hex");
}

export function createSalaryPdfCronToken(slipId: string) {
  const secret = env.SALARY_CRON_SECRET;
  if (!secret) throw new Error("SALARY_CRON_SECRET is not configured.");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  return `${expiresAt}.${sign(slipId, expiresAt, secret)}`;
}

export function verifySalaryPdfCronToken(slipId: string, token: string | undefined) {
  const secret = env.SALARY_CRON_SECRET;
  if (!secret || !token) return false;

  const [expiresAtText, signature, ...rest] = token.split(".");
  if (!expiresAtText || !signature || rest.length > 0) return false;

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;

  const expected = Buffer.from(sign(slipId, expiresAt, secret), "hex");
  const supplied = Buffer.from(signature, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
