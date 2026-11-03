import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { env } from "@/lib/env";
import { isSalaryPinSessionExpired } from "@/lib/schemas/salary-pin-schema";

const salaryPinCookieName = "crm_salary_pin";
const salaryPinCookiePath = "/";

type SalaryPinSession = {
  userId: string;
  sessionVersion: number;
  lastActivityAt: number;
};

function signPayload(payload: string) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(payload)
    .digest("base64url");
}

function encodeSession(session: SalaryPinSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(value: string | undefined, userId: string) {
  if (!value) {
    return null;
  }

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) {
    return null;
  }

  const expected = Buffer.from(signPayload(payload));
  const provided = Buffer.from(signature);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null;
  }

  try {
    const session: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof session !== "object" ||
      session === null ||
      !("userId" in session) ||
      !("sessionVersion" in session) ||
      !("lastActivityAt" in session) ||
      session.userId !== userId ||
      typeof session.sessionVersion !== "number" ||
      typeof session.lastActivityAt !== "number"
    ) {
      return null;
    }

    const sessionUserId = session.userId;
    const sessionVersion = session.sessionVersion;
    const lastActivityAt = session.lastActivityAt;
    if (
      typeof sessionUserId !== "string" ||
      typeof sessionVersion !== "number" ||
      typeof lastActivityAt !== "number"
    ) {
      return null;
    }

    if (isSalaryPinSessionExpired(lastActivityAt, Date.now())) {
      return null;
    }
    return { userId: sessionUserId, sessionVersion, lastActivityAt };
  } catch {
    return null;
  }
}

export async function hasSalaryPin(userId: string) {
  const pin = await prisma.salaryPin.findUnique({
    where: { userId },
    select: { userId: true },
  });
  return pin !== null;
}

export async function isSalaryPinSessionValid(userId: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(salaryPinCookieName)?.value;
  const session = decodeSession(value, userId);
  if (!session) {
    return false;
  }

  const record = await prisma.salaryPin.findUnique({
    where: { userId },
    select: { sessionVersion: true },
  });
  return record?.sessionVersion === session.sessionVersion;
}

export async function setSalaryPinSession(userId: string, sessionVersion: number) {
  const cookieStore = await cookies();
  cookieStore.set(
    salaryPinCookieName,
    encodeSession({ userId, sessionVersion, lastActivityAt: Date.now() }),
    {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: salaryPinCookiePath,
    },
  );
}

export async function refreshSalaryPinSession(userId: string) {
  const cookieStore = await cookies();
  const value = cookieStore.get(salaryPinCookieName)?.value;
  const session = decodeSession(value, userId);
  if (!session) {
    return false;
  }

  const record = await prisma.salaryPin.findUnique({
    where: { userId },
    select: { sessionVersion: true },
  });
  if (record?.sessionVersion !== session.sessionVersion) {
    return false;
  }

  await setSalaryPinSession(userId, session.sessionVersion);
  return true;
}

export async function clearSalaryPinSession() {
  const cookieStore = await cookies();
  cookieStore.set(salaryPinCookieName, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: salaryPinCookiePath,
    maxAge: 0,
  });
}
