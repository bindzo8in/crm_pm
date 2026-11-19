import { EmploymentStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";

export interface OrganizationMemberOption {
  id: string;
  name: string;
  email: string;
  pendingTaskCount: number;
  completedTaskCount: number;
}

export async function getOrganizationMemberOptions(
  organizationId: string,
): Promise<OrganizationMemberOption[]> {
  const members = await prisma.member.findMany({
    where: {
      organizationId,
      user: {
        banned: { not: true },
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const memberOptions = members.map(({ user }) => user);

  if (memberOptions.length === 0) {
    return [];
  }

  const taskAssignments = await prisma.projectTask.findMany({
    where: {
      assigneeId: { in: memberOptions.map(({ id }) => id) },
      project: { deletedAt: null },
    },
    select: {
      assigneeId: true,
      statusGroup: true,
    },
  });

  const taskCounts = new Map<string, { pending: number; completed: number }>();
  for (const task of taskAssignments) {
    if (!task.assigneeId) continue;

    const counts = taskCounts.get(task.assigneeId) ?? { pending: 0, completed: 0 };
    if (task.statusGroup === "DONE") {
      counts.completed += 1;
    } else if (task.statusGroup === "NOT_STARTED" || task.statusGroup === "ACTIVE") {
      counts.pending += 1;
    }
    taskCounts.set(task.assigneeId, counts);
  }

  return memberOptions
    .map((member) => ({
      ...member,
      pendingTaskCount: taskCounts.get(member.id)?.pending ?? 0,
      completedTaskCount: taskCounts.get(member.id)?.completed ?? 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function isActiveOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: {
      organizationId,
      userId,
      user: {
        banned: { not: true },
        employmentStatus: EmploymentStatus.ACTIVE,
      },
    },
    select: { id: true },
  });

  return Boolean(member);
}
