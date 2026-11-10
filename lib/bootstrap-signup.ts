import { createHmac, timingSafeEqual } from "node:crypto";

export const BOOTSTRAP_SIGNUP_HEADER = "x-crm-bootstrap-signature";

export function createBootstrapSignupSignature(
  email: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`bootstrap-signup:${email.trim().toLowerCase()}`)
    .digest("base64url");
}

export function isValidBootstrapSignupSignature(
  signature: string | null,
  email: string,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = Buffer.from(
    createBootstrapSignupSignature(email, secret),
    "base64url",
  );
  const received = Buffer.from(signature, "base64url");

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}
