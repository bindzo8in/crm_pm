import { NextRequest, NextResponse } from "next/server";
import {
  cancelLeaveRequestAction,
  getAllLeaveRequestsAction,
  getAnnualLeaveBalanceAction,
  getMyLeaveRequestsAction,
  submitLeaveRequestAction,
  updateLeaveStatusAction,
} from "@/actions/leave";
import { actionErrorResponse } from "@/lib/api-error";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must contain valid JSON." },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      case "submit":
        return NextResponse.json(await submitLeaveRequestAction(body));
      case "history":
        return NextResponse.json(await getMyLeaveRequestsAction(body));
      case "manage":
        return NextResponse.json(await getAllLeaveRequestsAction(body));
      case "cancel":
        return NextResponse.json(await cancelLeaveRequestAction(body));
      case "review":
        return NextResponse.json(await updateLeaveStatusAction(body));
      case "balance":
        return NextResponse.json(await getAnnualLeaveBalanceAction(body));
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action." },
          { status: 400 },
        );
    }
  } catch (error) {
    return actionErrorResponse(error, "Leave API error");
  }
}
