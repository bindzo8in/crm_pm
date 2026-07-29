import { NextRequest, NextResponse } from "next/server";
import {
  getSalaryStructureAction,
  saveSalaryStructureAction,
  generateSalarySlipAction,
  getSalarySlipsAction,
} from "@/actions/salary";

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
      const month = monthStr ? parseInt(monthStr) : undefined;
      const year = yearStr ? parseInt(yearStr) : undefined;
      
      const res = await getSalarySlipsAction({ userId, month, year });
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: "Invalid GET action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;
    let input = {};
    try {
      input = await req.json();
    } catch (e) {}

    if (action === "structure") {
      const res = await saveSalaryStructureAction(input as any);
      return NextResponse.json(res);
    }

    if (action === "generate") {
      const res = await generateSalarySlipAction(input as any);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: "Invalid POST action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
