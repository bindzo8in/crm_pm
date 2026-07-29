import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUpcomingHolidaysAction } from "@/actions/holiday";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await params;

    switch (action) {
      case "upcoming": {
        const result = await getUpcomingHolidaysAction();
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`Holiday API Error:`, error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
