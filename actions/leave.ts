"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { UserRole, LeaveType, LeaveStatus } from "@/app/generated/prisma/enums";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const leaveRequestSchema = z.object({
  type: z.nativeEnum(LeaveType),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().min(1, "Reason is required").max(500),
});

export async function submitLeaveRequestAction(input: any) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const parsed = leaveRequestSchema.parse(input);

  if (parsed.endDate < parsed.startDate) {
    throw new Error("End date cannot be before start date");
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      type: parsed.type,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      reason: parsed.reason,
      status: LeaveStatus.PENDING,
    },
  });

  revalidatePath("/dashboard/leaves");
  return { success: true, leave };
}

export async function getMyLeaveRequestsAction() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, leaves };
}

export async function getAllLeaveRequestsAction(page: number = 0, limit: number = 20) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    throw new Error("Unauthorized");
  }

  const leaves = await prisma.leaveRequest.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, department: true }
      }
    },
    orderBy: { createdAt: "desc" },
    skip: page * limit,
    take: limit,
  });

  const totalCount = await prisma.leaveRequest.count();

  return { success: true, leaves, totalCount };
}

export async function updateLeaveStatusAction(id: string, status: LeaveStatus, managerComment?: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    throw new Error("Unauthorized");
  }

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: { 
      status,
      managerComment: managerComment || null
    },
    include: { user: true }
  });

  revalidatePath("/dashboard/leaves");
  return { success: true, leave };
}
