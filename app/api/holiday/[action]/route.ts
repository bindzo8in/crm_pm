import { NextRequest, NextResponse } from "next/server";
import {
  createHolidayAction,
  deleteHolidayAction,
  getHolidaysAction,
  getUpcomingHolidaysAction,
  updateHolidayAction,
} from "@/actions/holiday";
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
      case "upcoming":
        return NextResponse.json(await getUpcomingHolidaysAction());
      case "list":
        return NextResponse.json(await getHolidaysAction(body));
      case "create":
        return NextResponse.json(await createHolidayAction(body));
      case "update":
        return NextResponse.json(await updateHolidayAction(body));
      case "delete":
        return NextResponse.json(await deleteHolidayAction(body));
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action." },
          { status: 400 },
        );
    }
  } catch (error) {
    return actionErrorResponse(error, "Holiday API error");
  }
}
