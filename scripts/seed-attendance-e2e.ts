import "dotenv/config";
import dotenv from "dotenv";
import {
  AttendanceStatus,
  Department,
  EmploymentStatus,
  UserRole,
  WorkMode,
} from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAttendanceDate } from "@/lib/date";
import {
  attendanceE2EEmail,
  attendanceE2EMonthRange,
  attendanceE2ERoster,
} from "../tests/playwright/support/attendance-month-fixture";

dotenv.config({ path: ".env.test", quiet: true });

const confirmation =
  "I_CONFIRM_THIS_IS_A_DISPOSABLE_ATTENDANCE_E2E_DATABASE";
const password = process.env.ATTENDANCE_E2E_PASSWORD;

function assertSafeDatabaseTarget() {
  const databaseUrl = process.env.DATABASE_URL;
  const explicitlyTargetedDatabase = process.env.ATTENDANCE_E2E_DATABASE_URL;

  if (
    process.env.ATTENDANCE_E2E_CONFIRM_SEED !== confirmation ||
    !databaseUrl ||
    databaseUrl !== explicitlyTargetedDatabase
  ) {
    throw new Error(
      "Seeding is disabled. Set ATTENDANCE_E2E_DATABASE_URL to exactly DATABASE_URL and ATTENDANCE_E2E_CONFIRM_SEED to the documented confirmation phrase.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(
    parsedUrl.hostname,
  );
  const databaseName = decodeURIComponent(parsedUrl.pathname.slice(1));
  if (!isLoopback || !databaseName.toLowerCase().includes("attendance_e2e")) {
    throw new Error(
      "Refusing to seed: use a local PostgreSQL database whose name contains attendance_e2e.",
    );
  }

  if (!password || password.length < 12) {
    throw new Error(
      "Set ATTENDANCE_E2E_PASSWORD to a test-only password of at least 12 characters.",
    );
  }
}

async function ensurePersona(
  persona: (typeof attendanceE2ERoster)[number],
  authContext: Awaited<typeof auth.$context>,
) {
  const email = attendanceE2EEmail(persona);
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  let userId: string;
  if (existing) {
    const credential = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: "credential" },
      select: { id: true },
    });
    if (!credential) {
      throw new Error(
        `The marked E2E user ${persona.key} has no credential account. Recreate it only in the isolated E2E database.`,
      );
    }
    userId = existing.id;
  } else {
    const created = await auth.api.createUser({
      body: {
        email,
        name: persona.name,
        password,
        role: persona.role,
        data: {
          emailVerified: true,
          workMode: WorkMode.OFFICE,
          ...(persona.department ? { department: persona.department } : {}),
        },
      },
    });
    userId = created.user.id;
  }

  const { start } = attendanceE2EMonthRange();
  const joiningDate = new Date(`${start}T00:00:00.000Z`);
  joiningDate.setUTCFullYear(joiningDate.getUTCFullYear() - 1);
  const hashedPassword = await authContext.password.hash(password ?? "");
  await authContext.internalAdapter.updatePassword(userId, hashedPassword);
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: persona.name,
      emailVerified: true,
      role: persona.role as UserRole,
      department: persona.department as Department | null,
      designation: persona.designation,
      employmentStatus: EmploymentStatus.ACTIVE,
      includeInAttendanceReports: true,
      workMode: WorkMode.OFFICE,
      createdAt: joiningDate,
      dateOfJoining: joiningDate,
    },
  });

  const credential = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { password: true },
  });
  if (
    !credential?.password ||
    !(await authContext.password.verify({
      password: password ?? "",
      hash: credential.password,
    }))
  ) {
    throw new Error(
      `Could not verify the configured E2E password for persona ${persona.key}.`,
    );
  }

  return userId;
}

async function seedMonth() {
  assertSafeDatabaseTarget();
  const range = attendanceE2EMonthRange();
  const authContext = await auth.$context;
  const userIds = await Promise.all(
    attendanceE2ERoster.map((persona) => ensurePersona(persona, authContext)),
  );
  const settings = await prisma.attendanceSettings.findFirst({
    select: { weekendDays: true },
  });
  const weekendDays = settings?.weekendDays ?? [0];
  const scheduledDates: Date[] = [];
  const startDate = new Date(`${range.start}T00:00:00.000Z`);
  const endDate = new Date(`${range.end}T00:00:00.000Z`);

  for (
    const date = new Date(startDate);
    date <= endDate;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    if (!weekendDays.includes(date.getUTCDay())) {
      scheduledDates.push(new Date(date));
    }
  }

  const salesUserId = userIds[2];
  if (!salesUserId || scheduledDates.length < 2) {
    throw new Error("The month must contain at least two scheduled workdays.");
  }

  const attendanceRows = userIds.flatMap((userId, userIndex) => {
    const persona = attendanceE2ERoster[userIndex];
    if (!persona) return [];

    return scheduledDates.map((date, dateIndex) => {
      const isLate = userIndex === 2 && dateIndex === 0;
      const isHalfDay = userIndex === 2 && dateIndex === 1;
      const isAbsent = userIndex === 3 && dateIndex === 0;
      const dateString = date.toISOString().slice(0, 10);
      const clockIn = new Date(
        `${dateString}T${isLate ? "04:15" : isHalfDay ? "05:30" : "03:30"}:00.000Z`,
      );
      const clockOut = isAbsent
        ? null
        : new Date(
            `${dateString}T${isHalfDay ? "09:30" : "12:30"}:00.000Z`,
          );

      return {
        userId,
        date,
        clockIn,
        clockOut,
        status: isAbsent
          ? AttendanceStatus.ABSENT
          : isLate
            ? AttendanceStatus.LATE
            : isHalfDay
              ? AttendanceStatus.HALF_DAY
              : AttendanceStatus.PRESENT,
        workMode: WorkMode.OFFICE,
        department: persona.department as Department | null,
        lateMinutes: isLate ? 45 : 0,
        workMinutes: isAbsent ? 0 : isHalfDay ? 240 : 480,
        notes: isAbsent ? "E2E seeded absence" : null,
      };
    });
  });

  const result = await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({
      where: {
        userId: { in: userIds },
        OR: [
          { date: { gte: startDate, lte: endDate } },
          { date: new Date(`${getAttendanceDate()}T00:00:00.000Z`) },
        ],
      },
    }),
    prisma.attendanceRecord.createMany({ data: attendanceRows }),
  ]);

  console.log(
    `Seeded ${result[1].count} marked E2E attendance records for ${range.month} and cleared today's marked E2E records for repeatable punch-flow tests.`,
  );
  console.log(
    `Created or reused ${attendanceE2ERoster.length} marked E2E accounts across all configured departments.`,
  );
}

seedMonth()
  .catch((error: unknown) => {
    console.error("Attendance E2E seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
