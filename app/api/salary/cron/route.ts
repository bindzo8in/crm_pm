import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { autoGenerateMonthlySalarySlipsAction } from "@/actions/salary";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function hasValidCronSecret(request: NextRequest) {
  const secret = env.SALARY_CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization?.startsWith("Bearer ")) {
    return false;
  }

  const suppliedSecret = Buffer.from(authorization.slice("Bearer ".length));
  const expectedSecret = Buffer.from(secret);

  return (
    suppliedSecret.length === expectedSecret.length &&
    timingSafeEqual(suppliedSecret, expectedSecret)
  );
}

export async function POST(request: NextRequest) {
  if (!env.SALARY_CRON_SECRET) {
    console.error("SALARY_CRON_SECRET is not configured.");
    return NextResponse.json(
      { success: false, error: "Salary payroll scheduler is not configured." },
      { status: 503 },
    );
  }

  if (!hasValidCronSecret(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const now = new Date();
  const previousMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );

  const result = await autoGenerateMonthlySalarySlipsAction({
    month: previousMonth.getUTCMonth() + 1,
    year: previousMonth.getUTCFullYear(),
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
