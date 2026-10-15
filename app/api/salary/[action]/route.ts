import { NextRequest, NextResponse } from "next/server";
import {
  getSalaryStructureAction,
  saveSalaryStructureAction,
  generateSalarySlipAction,
  getSalarySlipsAction,
  updateSalarySlipStatusAction,
  updateSalarySlipAdjustmentsAction,
} from "@/actions/salary";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error.";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    const url = new URL(req.url);

    if (action === "structure") {
      const userId = url.searchParams.get("userId");
      if (!userId) return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
      const res = await getSalaryStructureAction(userId);
      return NextResponse.json(res);
    }

    if (action === "slips") {
      const userId = url.searchParams.get("userId") || undefined;
      const monthStr = url.searchParams.get("month");
      const yearStr = url.searchParams.get("year");
      const month = monthStr ? Number(monthStr) : undefined;
      const year = yearStr ? Number(yearStr) : undefined;
      
      const res = await getSalarySlipsAction({ userId, month, year });
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: "Invalid GET action" }, { status: 400 });
  } catch (error) {
    console.error("Salary API GET failed:", error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    let input: unknown;
    try {
      input = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "A valid JSON body is required." }, { status: 400 });
    }

    if (action === "structure") {
      const res = await saveSalaryStructureAction(input);
      return NextResponse.json(res);
    }

    if (action === "generate") {
      const res = await generateSalarySlipAction(input);
      return NextResponse.json(res);
    }

    if (action === "status") {
      const res = await updateSalarySlipStatusAction(input);
      return NextResponse.json(res);
    }

    if (action === "adjustments") {
      const res = await updateSalarySlipAdjustmentsAction(input);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: "Invalid POST action" }, { status: 400 });
  } catch (error) {
    console.error("Salary API POST failed:", error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
