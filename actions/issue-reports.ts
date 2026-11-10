"use server";

import { createIssueReportSchema, updateIssueReportSchema } from "@/lib/schemas/issue-report";
import { ActionError } from "@/lib/action-error";
import {
  requireIssueReportManager,
  requireIssueReportUser,
} from "@/lib/issue-report-access";
import { canManageIssueReports } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const issueReportFields = {
  id: true,
  type: true,
  title: true,
  description: true,
  status: true,
  response: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  reviewedById: true,
  createdBy: { select: { name: true, department: true } },
  reviewedBy: { select: { name: true } },
} as const;

export async function createIssueReportAction(input: unknown) {
  const parsed = createIssueReportSchema.parse(input);
  const user = await requireIssueReportUser();
  const report = await prisma.issueReport.create({
    data: { ...parsed, createdById: user.id },
    select: issueReportFields,
  });

  revalidatePath("/dashboard/issues");
  return { success: true, report };
}

export async function getIssueReportsAction() {
  const user = await requireIssueReportUser();
  const where = canViewAllReports(user)
    ? {}
    : { createdById: user.id };
  const reports = await prisma.issueReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: issueReportFields,
  });

  return { success: true, reports };
}

export async function updateIssueReportAction(input: unknown) {
  const parsed = updateIssueReportSchema.parse(input);
  const user = await requireIssueReportManager();
  const existing = await prisma.issueReport.findUnique({
    where: { id: parsed.id },
    select: { id: true },
  });
  if (!existing) {
    throw new ActionError("This report no longer exists.", 404);
  }

  const report = await prisma.issueReport.update({
    where: { id: parsed.id },
    data: {
      status: parsed.status,
      response: parsed.response || null,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
    select: issueReportFields,
  });

  revalidatePath("/dashboard/issues");
  return { success: true, report };
}

function canViewAllReports(user: Awaited<ReturnType<typeof requireIssueReportUser>>) {
  return canManageIssueReports(user);
}
