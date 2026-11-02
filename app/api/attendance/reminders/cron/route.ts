import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { sendAttendanceReminders } from "@/services/attendance-reminder-service";

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
    const result = await sendAttendanceReminders();
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
