import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ message: "Project ID is required." }, { status: 400 });

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
    select: { projectId: true },
  });
  const project = membership ? null : await prisma.project.findUnique({
    where: { id: projectId },
    select: { projectManagerId: true, createdById: true },
  });
  const hasProjectAccess = Boolean(membership || project && (
    project.projectManagerId === session.user.id || project.createdById === session.user.id
  ));
  if (!hasProjectAccess) return NextResponse.json({ message: "Project access denied." }, { status: 403 });

  return NextResponse.json({ authorized: true, projectId });
}
