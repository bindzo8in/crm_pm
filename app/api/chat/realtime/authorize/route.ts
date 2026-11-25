import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { canAccessProjectChat } from "@/lib/project-chat-access";

export async function GET(request: NextRequest) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ message: "Project ID is required." }, { status: 400 });

  const hasProjectAccess = await canAccessProjectChat(
    projectId,
    session.user.id,
    request.headers,
  );
  if (!hasProjectAccess) return NextResponse.json({ message: "Project access denied." }, { status: 403 });

  return NextResponse.json({ authorized: true, projectId });
}
