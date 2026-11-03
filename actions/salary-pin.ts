"use server";

import { randomBytes } from "node:crypto";
import { UserRole } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { sendSalaryPinResetEmail } from "@/lib/email";
import {
  salaryPinSchema,
  salaryPinResetTokenSchema,
  getSalaryPinFailureState,
  isSalaryPinResetExpired,
} from "@/lib/schemas/salary-pin-schema";
import {
  createSalaryPinResetToken,
  hashSalaryPin,
  hashSalaryPinResetToken,
  verifySalaryPin,
} from "@/lib/salary-pin-crypto";
import {
  clearSalaryPinSession,
  refreshSalaryPinSession,
  setSalaryPinSession,
} from "@/lib/salary-pin";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

const resetTokenLifetimeMs = 30 * 60 * 1000;
const resetRequestCooldownMs = 60 * 1000;

async function getSalaryManager() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return null;
  }

  const isSalaryManager =
    session.user.role === UserRole.SUPER_ADMIN ||
    session.user.role === UserRole.ADMIN ||
    (session.user.role === UserRole.STAFF && session.user.department === "HR");

  if (!isSalaryManager) {
    return null;
  }
  if (
    session.user.role === UserRole.STAFF &&
    session.user.department === "HR"
  ) {
    return session.user;
  }

  const permission = await auth.api.userHasPermission({
    headers: requestHeaders,
    body: { permissions: { salary: ["read-all"] } },
  });
  return permission.success ? session.user : null;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function setupSalaryPinAction(input: unknown) {
  const manager = await getSalaryManager();
  if (!manager) {
    return { success: false, error: "You are not authorized to manage salary PINs." };
  }

  const parsed = salaryPinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Enter a six-digit PIN." };
  }

  try {
    const pinHash = await hashSalaryPin(parsed.data);
    await prisma.salaryPin.create({
      data: { userId: manager.id, pinHash },
    });
    await setSalaryPinSession(manager.id, 0);
    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "A salary PIN is already set. Enter it to unlock Salary Management.",
      };
    }
    console.error("Failed to set salary PIN.", error);
    return { success: false, error: "Could not set the salary PIN. Try again." };
  }
}

export async function verifySalaryPinAction(input: unknown) {
  const manager = await getSalaryManager();
  if (!manager) {
    return { success: false, error: "You are not authorized to manage salary." };
  }

  const parsed = salaryPinSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Enter a six-digit PIN." };
  }

  try {
    const now = new Date();
    const result = await prisma.$transaction(
      async (tx) => {
        const record = await tx.salaryPin.findUnique({
          where: { userId: manager.id },
        });
        if (!record) {
          return { status: "not-configured" as const };
        }

        if (record.lockedUntil && record.lockedUntil > now) {
          return { status: "locked" as const, lockedUntil: record.lockedUntil };
        }

        const isValid = await verifySalaryPin(parsed.data, record.pinHash);
        if (isValid) {
          await tx.salaryPin.update({
            where: { userId: manager.id },
            data: { failedAttempts: 0, lockedUntil: null },
          });
          return {
            status: "verified" as const,
            sessionVersion: record.sessionVersion,
          };
        }

        const previousAttempts =
          record.lockedUntil && record.lockedUntil <= now
            ? 0
            : record.failedAttempts;
        const failureState = getSalaryPinFailureState(previousAttempts, now);
        await tx.salaryPin.update({
          where: { userId: manager.id },
          data: failureState,
        });
        return failureState.lockedUntil
          ? { status: "locked" as const, lockedUntil: failureState.lockedUntil }
          : { status: "invalid" as const };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.status === "verified") {
      await setSalaryPinSession(manager.id, result.sessionVersion);
      return { success: true };
    }
    if (result.status === "locked") {
      return {
        success: false,
        error: `Too many incorrect attempts. Try again after ${result.lockedUntil.toLocaleTimeString()}. You can also reset your PIN by email.`,
      };
    }
    if (result.status === "not-configured") {
      return {
        success: false,
        error: "No salary PIN is set. Refresh the page to set one up.",
      };
    }
    return { success: false, error: "Incorrect PIN. Try again or reset it by email." };
  } catch (error) {
    console.error("Failed to verify salary PIN.", error);
    return { success: false, error: "Could not verify the PIN. Try again." };
  }
}

export async function requestSalaryPinResetAction() {
  const manager = await getSalaryManager();
  if (!manager) {
    return { success: false, error: "You are not authorized to manage salary PINs." };
  }

  const now = new Date();
  const cooldownBefore = new Date(now.getTime() - resetRequestCooldownMs);
  try {
    const cooldown = await prisma.salaryPin.updateMany({
      where: {
        userId: manager.id,
        OR: [
          { lastResetRequestedAt: null },
          { lastResetRequestedAt: { lte: cooldownBefore } },
        ],
      },
      data: { lastResetRequestedAt: now },
    });
    if (cooldown.count !== 1) {
      return {
        success: true,
        message: "If your PIN is set, a reset link will be sent to your account email.",
      };
    }

    const rawToken = createSalaryPinResetToken();
    const tokenHash = hashSalaryPinResetToken(rawToken);
    const expiresAt = new Date(now.getTime() + resetTokenLifetimeMs);
    await prisma.$transaction(async (tx) => {
      await tx.salaryPinResetToken.deleteMany({
        where: { userId: manager.id },
      });
      await tx.salaryPinResetToken.create({
        data: {
          id: randomBytes(16).toString("hex"),
          userId: manager.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const resetUrl = new URL("/salary/pin/reset", env.NEXT_PUBLIC_SITE_URL);
    resetUrl.searchParams.set("token", rawToken);
    try {
      await sendSalaryPinResetEmail({
        name: manager.name,
        email: manager.email,
        appName: env.NEXT_PUBLIC_APP_NAME,
        resetUrl: resetUrl.toString(),
        supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL,
      });
    } catch (error) {
      await prisma.salaryPinResetToken.deleteMany({ where: { tokenHash } });
      throw error;
    }

    return {
      success: true,
      message: "If your PIN is set, a reset link will be sent to your account email.",
    };
  } catch (error) {
    console.error("Failed to request salary PIN reset.", error);
    return {
      success: false,
      error: "Could not send the reset email. Try again later.",
    };
  }
}

export async function completeSalaryPinResetAction(input: unknown) {
  if (
    typeof input !== "object" ||
    input === null ||
    !("token" in input) ||
    !("pin" in input)
  ) {
    return { success: false, error: "Invalid or expired reset link." };
  }

  const tokenResult = salaryPinResetTokenSchema.safeParse(input.token);
  const pinResult = salaryPinSchema.safeParse(input.pin);
  if (!tokenResult.success || !pinResult.success) {
    return {
      success: false,
      error: pinResult.success ? "Invalid or expired reset link." : "Enter a six-digit PIN.",
    };
  }

  try {
    const tokenHash = hashSalaryPinResetToken(tokenResult.data);
    const resetRecord = await prisma.salaryPinResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
    const now = new Date();
    if (!resetRecord || isSalaryPinResetExpired(resetRecord.expiresAt, now)) {
      return { success: false, error: "This reset link is invalid or has expired." };
    }

    const pinHash = await hashSalaryPin(pinResult.data);
    const reset = await prisma.$transaction(async (tx) => {
      const claimedToken = await tx.salaryPinResetToken.deleteMany({
        where: { tokenHash, expiresAt: { gt: now } },
      });
      if (claimedToken.count !== 1) {
        return false;
      }

      await tx.salaryPin.upsert({
        where: { userId: resetRecord.userId },
        create: {
          userId: resetRecord.userId,
          pinHash,
          failedAttempts: 0,
          lockedUntil: null,
        },
        update: {
          pinHash,
          sessionVersion: { increment: 1 },
          failedAttempts: 0,
          lockedUntil: null,
          lastResetRequestedAt: null,
        },
      });
      await tx.salaryPinResetToken.deleteMany({
        where: { userId: resetRecord.userId },
      });
      return true;
    });

    if (!reset) {
      return { success: false, error: "This reset link is invalid or has expired." };
    }

    await clearSalaryPinSession();
    return { success: true };
  } catch (error) {
    console.error("Failed to reset salary PIN.", error);
    return { success: false, error: "Could not reset the PIN. Try again." };
  }
}

export async function refreshSalaryPinSessionAction() {
  const manager = await getSalaryManager();
  if (!manager) {
    return { success: false };
  }

  try {
    return { success: await refreshSalaryPinSession(manager.id) };
  } catch (error) {
    console.error("Failed to refresh salary PIN session.", error);
    return { success: false };
  }
}

export async function lockSalaryPinSessionAction() {
  await clearSalaryPinSession();
}
