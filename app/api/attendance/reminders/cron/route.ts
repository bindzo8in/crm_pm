import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendAttendanceReminders } from "@/services/attendance-reminder-service";
import { sendAttendanceScheduleReminders } from "@/services/attendance-schedule-reminder-service";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function hasValidCronSecret(request: NextRequest) {
  const secret = env.SALARY_CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: NextRequest) {
  if (!env.SALARY_CRON_SECRET) {
    console.error("SALARY_CRON_SECRET is not configured.");
    return NextResponse.json(
      { success: false, error: "Attendance reminder scheduler is not configured." },
      { status: 503 },
    );
  }
  if (!hasValidCronSecret(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });
    const organizationResults = await Promise.all(
      organizations.map(async ({ id }) => {
        const [morning, schedule] = await Promise.all([
          sendAttendanceReminders(id),
          sendAttendanceScheduleReminders(id),
        ]);
        return { morning, schedule };
      }),
    );
    const result = {
      notified: organizationResults.reduce(
        (total, { morning, schedule }) =>
          total + morning.notified + schedule.notified,
        0,
      ),
      pushSent: organizationResults.reduce(
        (total, { morning, schedule }) =>
          total + morning.pushSent + schedule.pushSent,
        0,
      ),
      pushSkipped: organizationResults.reduce(
        (total, { morning, schedule }) =>
          total + morning.pushSkipped + schedule.pushSkipped,
        0,
      ),
      pushFailures: organizationResults.reduce(
        (total, { morning, schedule }) =>
          total + morning.pushFailures + schedule.pushFailures,
        0,
      ),
      ...(organizationResults.length > 0 &&
      organizationResults.every(({ morning, schedule }) =>
        Boolean(morning.skipped && schedule.skipped)
      )
        ? { skipped: "Outside the configured reminder windows for every organization." }
        : {}),
    };
    return NextResponse.json({ success: true, ...result }, {
      status: result.pushFailures > 0 ? 500 : 200,
    });
  } catch (error: unknown) {
    console.error("Attendance reminder scheduler failed.", error);
    return NextResponse.json(
      { success: false, error: "Attendance reminders could not be processed." },
      { status: 500 },
    );
  }
}
