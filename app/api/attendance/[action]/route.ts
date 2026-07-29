import { NextRequest, NextResponse } from "next/server";
import {
  clockInAction,
  clockOutAction,
  startBreakAction,
  endBreakAction,
  getTodayAttendanceAction,
  getAttendanceLogsAction,
  editAttendanceAction,
} from "@/actions/attendance";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const { action } = await params;

    if (action === "today") {
      const res = await getTodayAttendanceAction();
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
    } catch (e) {
      // Body might be empty
    }

    if (action === "clock-in") {
      const res = await clockInAction(input as any);
      return NextResponse.json(res);
    }

    if (action === "clock-out") {
      const res = await clockOutAction(input as any);
      return NextResponse.json(res);
    }

    if (action === "start-break") {
      const res = await startBreakAction(input as any);
      return NextResponse.json(res);
    }

    if (action === "end-break") {
      const res = await endBreakAction(input as any);
      return NextResponse.json(res);
    }

    if (action === "logs") {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

      const res = await getAttendanceLogsAction({
        ...(input as any),
        userId: session.user.id,
      });
      return NextResponse.json(res);
    }

    if (action === "edit") {
      const res = await editAttendanceAction(input as any);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: "Invalid POST action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
