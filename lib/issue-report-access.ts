import { EmploymentStatus } from "@/app/generated/prisma/enums";
import { ActionError } from "@/lib/action-error";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canManageIssueReports } from "@/lib/permissions";
import { headers } from "next/headers";

export async function requireIssueReportUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new ActionError("Sign in to access issue reports.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      role: true,
      department: true,
      employmentStatus: true,
    },
  });

  if (!user || user.employmentStatus !== EmploymentStatus.ACTIVE) {
    throw new ActionError("Your account is not active.", 403);
  }

  return user;
}

export async function requireIssueReportManager() {
  const user = await requireIssueReportUser();
  if (!canManageIssueReports(user)) {
    throw new ActionError("Only Admin and HR can review issue reports.", 403);
  }
  return user;
}
