"use server";

import { UserRole } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  clockInSchema,
  ClockInInput,
  clockOutSchema,
  ClockOutInput,
  startBreakSchema,
  StartBreakInput,
  endBreakSchema,
  EndBreakInput,
  attendanceFilterSchema,
  AttendanceFilterInput,
} from "@/lib/schemas/attendance-schema";
import { headers } from "next/headers";

async function getAuthenticatedUser() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  return { session, reqHeaders };
}

function getTodayDateOnly(dateInput: Date = new Date()): Date {
  const d = new Date(dateInput);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getAttendanceSettings() {
  let settings = await prisma.attendanceSettings.findFirst();
  if (!settings) {
    settings = await prisma.attendanceSettings.create({
      data: {
        expectedClockIn: "09:00",
        expectedClockOut: "18:00",
        gracePeriodMinutes: 15,
      },
    });
  }
  return settings;
}

export async function clockInAction(input: ClockInInput) {
  const { session, reqHeaders } = await getAuthenticatedUser();
  const validated = clockInSchema.parse(input);

  const today = getTodayDateOnly();

  // Check if already clocked in today
  const existingRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId: session.user.id,
      date: today,
    },
  });

  if (existingRecord) {
    throw new Error("You have already clocked in for today.");
  }

  const userAgent = reqHeaders.get("user-agent") || undefined;
  const ipAddress =
    reqHeaders.get("x-forwarded-for")?.split(",")[0] ||
    reqHeaders.get("x-real-ip") ||
    undefined;

  // Extract OS/Browser simple string for deviceInfo
  let deviceInfo = "Web Browser";
  if (userAgent) {
    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      deviceInfo = "Mobile Device";
    } else if (userAgent.includes("Windows")) {
      deviceInfo = "Windows PC";
    } else if (userAgent.includes("Macintosh")) {
      deviceInfo = "Mac";
    } else if (userAgent.includes("Linux")) {
      deviceInfo = "Linux Device";
    }
  }

  const settings = await getAttendanceSettings();
  const now = new Date();

  // Determine LATE vs PRESENT based on settings
  const [expHour, expMinute] = settings.expectedClockIn.split(":").map(Number);
  const cutoffTime = new Date(now);
  cutoffTime.setHours(expHour, expMinute + settings.gracePeriodMinutes, 0, 0);

  const status = now > cutoffTime ? "LATE" : "PRESENT";

  const record = await prisma.attendanceRecord.create({
    data: {
      userId: session.user.id,
      date: today,
      clockIn: now,
      status,
      workMode: validated.workMode,
      ipAddress,
      userAgent,
      deviceInfo,
      latitude: validated.latitude ?? null,
      longitude: validated.longitude ?? null,
      locationName: validated.locationName ?? null,
      selfieUrl: validated.selfieUrl ?? null,
      selfiePublicId: validated.selfiePublicId ?? null,
      notes: validated.notes ?? null,
    },
  });

  return { success: true, record: JSON.parse(JSON.stringify(record)) };
}

export async function clockOutAction(input: ClockOutInput) {
  const { session } = await getAuthenticatedUser();
  const validated = clockOutSchema.parse(input);

  const today = getTodayDateOnly();

  const activeRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId: session.user.id,
      date: today,
      clockOut: null,
    },
    include: {
      breaks: true,
    },
  });

  if (!activeRecord) {
    throw new Error("No active clock-in session found for today.");
  }

  // End any open breaks automatically
  const openBreak = activeRecord.breaks.find((b) => !b.breakEnd);
  if (openBreak) {
    await prisma.attendanceBreak.update({
      where: { id: openBreak.id },
      data: { breakEnd: new Date() },
    });
  }

  const now = new Date();
  const settings = await getAttendanceSettings();

  const [expHour, expMin] = settings.expectedClockOut.split(":").map(Number);
  const expectedOutTime = new Date(now);
  expectedOutTime.setHours(expHour, expMin, 0, 0);

  const earlyLeave = now < expectedOutTime;

  const record = await prisma.attendanceRecord.update({
    where: { id: activeRecord.id },
    data: {
      clockOut: now,
      earlyLeave,
      notes: validated.notes
        ? `${activeRecord.notes ? activeRecord.notes + " | " : ""}${validated.notes}`
        : activeRecord.notes,
    },
  });

  return { success: true, record: JSON.parse(JSON.stringify(record)) };
}

export async function startBreakAction(input: StartBreakInput) {
  const { session } = await getAuthenticatedUser();
  const validated = startBreakSchema.parse(input);

  const today = getTodayDateOnly();

  const activeRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId: session.user.id,
      date: today,
      clockOut: null,
    },
    include: {
      breaks: true,
    },
  });

  if (!activeRecord) {
    throw new Error("You must clock in before taking a break.");
  }

  const openBreak = activeRecord.breaks.find((b) => !b.breakEnd);
  if (openBreak) {
    throw new Error("You are already on break.");
  }

  const newBreak = await prisma.attendanceBreak.create({
    data: {
      attendanceRecordId: activeRecord.id,
      breakStart: new Date(),
      type: validated.type,
    },
  });

  return { success: true, break: JSON.parse(JSON.stringify(newBreak)) };
}

export async function endBreakAction(input: EndBreakInput) {
  const { session } = await getAuthenticatedUser();
  const validated = endBreakSchema.parse(input);

  const today = getTodayDateOnly();

  const activeRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId: session.user.id,
      date: today,
      clockOut: null,
    },
    include: {
      breaks: true,
    },
  });

  if (!activeRecord) {
    throw new Error("No active attendance record found.");
  }

  let openBreak = activeRecord.breaks.find((b) => !b.breakEnd);
  if (validated.breakId) {
    openBreak = activeRecord.breaks.find((b) => b.id === validated.breakId && !b.breakEnd);
  }

  if (!openBreak) {
    throw new Error("No active break to end.");
  }

  await prisma.attendanceBreak.update({
    where: { id: openBreak.id },
    data: {
      breakEnd: new Date(),
    },
  });

  return { success: true };
}

export async function getTodayAttendanceAction() {
  const { session } = await getAuthenticatedUser();
  const today = getTodayDateOnly();

  const record = await prisma.attendanceRecord.findFirst({
    where: {
      userId: session.user.id,
      date: today,
    },
    include: {
      breaks: {
        orderBy: { breakStart: "desc" },
      },
    },
  });

  const settings = await getAttendanceSettings();

  return {
    record: record ? JSON.parse(JSON.stringify(record)) : null,
    settings: settings ? JSON.parse(JSON.stringify(settings)) : null,
    userRole: session.user.role as UserRole,
  };
}

export async function getAttendanceLogsAction(input: Partial<AttendanceFilterInput>) {
  const { session } = await getAuthenticatedUser();
  const parsed = attendanceFilterSchema.parse(input);

  const isStaff = session.user.role === UserRole.STAFF;
  const targetUserId = isStaff ? session.user.id : parsed.userId;

  const whereClause: any = {};

  if (targetUserId) {
    whereClause.userId = targetUserId;
  }

  if (parsed.status) {
    whereClause.status = parsed.status;
  }

  if (parsed.startDate || parsed.endDate) {
    whereClause.date = {};
    if (parsed.startDate) {
      whereClause.date.gte = getTodayDateOnly(new Date(parsed.startDate));
    }
    if (parsed.endDate) {
      whereClause.date.lte = getTodayDateOnly(new Date(parsed.endDate));
    }
  }

  const skip = (parsed.page - 1) * parsed.limit;

  const [records, totalCount] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
          },
        },
        breaks: true,
      },
      orderBy: { clockIn: "desc" },
      skip,
      take: parsed.limit,
    }),
    prisma.attendanceRecord.count({ where: whereClause }),
  ]);

  return {
    records: JSON.parse(JSON.stringify(records)),
    totalCount,
    totalPages: Math.ceil(totalCount / parsed.limit),
    currentPage: parsed.page,
  };
}

export async function getAttendanceAnalyticsAction(filters: { startDate?: string; endDate?: string }) {
  const { session } = await getAuthenticatedUser();

  const isStaff = session.user.role === UserRole.STAFF;
  const whereClause: any = {};

  if (isStaff) {
    whereClause.userId = session.user.id;
  }

  if (filters.startDate || filters.endDate) {
    whereClause.date = {};
    if (filters.startDate) {
      whereClause.date.gte = getTodayDateOnly(new Date(filters.startDate));
    }
    if (filters.endDate) {
      whereClause.date.lte = getTodayDateOnly(new Date(filters.endDate));
    }
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    include: {
      breaks: true,
    },
    orderBy: { date: "asc" },
  });

  let totalDays = records.length;
  let presentCount = 0;
  let lateCount = 0;
  let halfDayCount = 0;
  let totalHours = 0;

  const chartMap: Record<string, { date: string; present: number; late: number; hours: number }> = {};

  for (const rec of records) {
    if (rec.status === "PRESENT") presentCount++;
    if (rec.status === "LATE") lateCount++;
    if (rec.status === "HALF_DAY") halfDayCount++;

    let durationMs = 0;
    if (rec.clockIn && rec.clockOut) {
      durationMs = rec.clockOut.getTime() - rec.clockIn.getTime();
      // subtract break duration
      for (const b of rec.breaks) {
        if (b.breakStart && b.breakEnd) {
          durationMs -= (b.breakEnd.getTime() - b.breakStart.getTime());
        }
      }
    }
    const hours = Math.max(0, Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10);
    totalHours += hours;

    const dateKey = rec.date.toISOString().split("T")[0];
    if (!chartMap[dateKey]) {
      chartMap[dateKey] = { date: dateKey, present: 0, late: 0, hours: 0 };
    }
    if (rec.status === "PRESENT") chartMap[dateKey].present += 1;
    if (rec.status === "LATE") chartMap[dateKey].late += 1;
    chartMap[dateKey].hours += hours;
  }

  const punctualityRate = totalDays > 0 ? Math.round(((presentCount + halfDayCount) / totalDays) * 100) : 100;
  const chartData = Object.values(chartMap);

  return {
    totalDays,
    presentCount,
    lateCount,
    halfDayCount,
    totalHours: Math.round(totalHours * 10) / 10,
    punctualityRate,
    chartData,
  };
}

export async function updateAttendanceSettingsAction(input: {
  expectedClockIn: string;
  expectedClockOut: string;
  gracePeriodMinutes: number;
}) {
  const { session } = await getAuthenticatedUser();

  if (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN) {
    throw new Error("Only admins can update attendance settings.");
  }

  const existing = await prisma.attendanceSettings.findFirst();

  let settings;
  if (existing) {
    settings = await prisma.attendanceSettings.update({
      where: { id: existing.id },
      data: input,
    });
  } else {
    settings = await prisma.attendanceSettings.create({
      data: input,
    });
  }

  return { success: true, settings };
}
