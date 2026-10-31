import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { ProjectQuery } from "@/lib/schemas/project-schema";
import { EmploymentStatus } from "@/app/generated/prisma/enums";
import type {
  ProjectPriority,
  ProjectStatus,
  ProjectTaskStatus,
} from "@/app/generated/prisma/enums";

const projectCardSelect = {
  id: true,
  projectNumber: true,
  name: true,
  status: true,
  priority: true,
  startDate: true,
  dueDate: true,
  updatedAt: true,
  currency: true,
  budgetAmount: true,
  customer: { select: { id: true, displayName: true, companyName: true } },
  projectManager: { select: { id: true, name: true } },
  members: {
    select: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: "asc" as const },
  },
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectSelect;

export type ProjectCardRecord = Prisma.ProjectGetPayload<{
  select: typeof projectCardSelect;
}>;

function assignedProjectFilter(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { projectManagerId: userId },
      { members: { some: { userId } } },
    ],
  };
}

function projectFilters(query: ProjectQuery): Prisma.ProjectWhereInput {
  const conditions: Prisma.ProjectWhereInput[] = [];

  if (query.status) conditions.push({ status: query.status });
  if (query.priority) conditions.push({ priority: query.priority });
  if (query.customerId) conditions.push({ customerId: query.customerId });
  if (query.projectManagerId) conditions.push({ projectManagerId: query.projectManagerId });
  if (query.dueFrom || query.dueTo) {
    conditions.push({
      dueDate: {
        ...(query.dueFrom ? { gte: new Date(`${query.dueFrom}T00:00:00.000Z`) } : {}),
        ...(query.dueTo ? { lte: new Date(`${query.dueTo}T23:59:59.999Z`) } : {}),
      },
    });
  }
  if (query.search) {
    const projectNumber = Number(query.search.replace(/^PRJ-/i, ""));
    conditions.push({
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        ...(Number.isSafeInteger(projectNumber) && projectNumber > 0
          ? [{ projectNumber }]
          : []),
        {
          customer: {
            is: {
              OR: [
                { displayName: { contains: query.search, mode: "insensitive" } },
                { companyName: { contains: query.search, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  return conditions.length ? { AND: conditions } : {};
}

export async function getProjectPage(
  query: ProjectQuery,
  actor: { id: string; canReadAll: boolean; canViewBudget: boolean },
) {
  const filters = projectFilters(query);
  const accessFilter = actor.canReadAll ? {} : assignedProjectFilter(actor.id);
  const baseWhere: Prisma.ProjectWhereInput = {
    deletedAt: null,
    AND: [filters, accessFilter],
  };
  const pageWhere: Prisma.ProjectWhereInput = { ...baseWhere };

  if (query.cursor) {
    const isNext = query.direction === "next";
    const useLessThan = query.sortDirection === "desc" ? isNext : !isNext;
    pageWhere.projectNumber = useLessThan
      ? { lt: query.cursor }
      : { gt: query.cursor };
  }

  const orderDirection =
    query.direction === "previous"
      ? query.sortDirection === "desc" ? "asc" : "desc"
      : query.sortDirection;

  const [rawItems, total, allCount, activeCount, planningCount, upcomingCount, overdueCount, completedCount] =
    await prisma.$transaction(async (tx) => {
      const rawItems = await tx.project.findMany({
        where: pageWhere,
        select: projectCardSelect,
        orderBy: [{ projectNumber: orderDirection }, { id: orderDirection }],
        take: query.pageSize + 1,
      });
      const total = await tx.project.count({ where: baseWhere });
      const allCount = await tx.project.count({ where: { ...accessFilter, deletedAt: null } });
      const activeCount = await tx.project.count({
        where: {
          ...accessFilter,
          deletedAt: null,
          status: { in: ["NOT_STARTED", "IN_PROGRESS", "ON_HOLD"] },
        },
      });
      const planningCount = await tx.project.count({
        where: { ...accessFilter, deletedAt: null, status: "PLANNING" },
      });
      const upcomingCount = await tx.project.count({
        where: {
          ...accessFilter,
          deletedAt: null,
          status: { in: ["PLANNING", "NOT_STARTED", "IN_PROGRESS", "ON_HOLD"] },
          dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
        },
      });
      const overdueCount = await tx.project.count({
        where: {
          ...accessFilter,
          deletedAt: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: new Date() },
        },
      });
      const completedCount = await tx.project.count({
        where: { ...accessFilter, deletedAt: null, status: "COMPLETED" },
      });

      return [
        rawItems,
        total,
        allCount,
        activeCount,
        planningCount,
        upcomingCount,
        overdueCount,
        completedCount,
      ] as const;
    });

  const hasExtra = rawItems.length > query.pageSize;
  const pageItems = rawItems.slice(0, query.pageSize);
  const items = query.direction === "previous" ? pageItems.reverse() : pageItems;
  const serializeItem = (item: ProjectCardRecord) => ({
    id: item.id,
    projectNumber: item.projectNumber,
    projectCode: formatProjectCode(item.projectNumber),
    name: item.name,
    status: item.status,
    priority: item.priority,
    startDate: item.startDate,
    dueDate: item.dueDate,
    updatedAt: item.updatedAt,
    currency: item.currency,
    budgetAmount: actor.canViewBudget ? item.budgetAmount?.toNumber() ?? null : null,
    customer: item.customer,
    projectManager: item.projectManager,
    members: item.members.map(({ user }) => user),
    taskCount: item._count.tasks,
  });
  const serializedItems = items.map(serializeItem);

  return {
    items: serializedItems,
    total,
    nextCursor: serializedItems.at(-1)?.projectNumber ?? null,
    previousCursor: serializedItems[0]?.projectNumber ?? null,
    canGoNext: query.direction === "previous" ? Boolean(query.cursor) : hasExtra,
    canGoPrevious: query.direction === "previous" ? hasExtra : Boolean(query.cursor),
    summary: {
      total: allCount,
      active: activeCount,
      planning: planningCount,
      dueSoon: upcomingCount,
      overdue: overdueCount,
      completed: completedCount,
    },
  };
}

export function formatProjectCode(projectNumber: number) {
  return `PRJ-${String(projectNumber).padStart(5, "0")}`;
}

export async function getProjectById(
  projectId: string,
  actor: {
    id: string;
    canReadAll: boolean;
    canViewBudget: boolean;
    canManageProjects: boolean;
  },
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      ...(actor.canReadAll ? {} : assignedProjectFilter(actor.id)),
    },
    include: {
      customer: {
        select: {
          id: true,
          displayName: true,
          companyName: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactPhone: true,
          deletedAt: true,
        },
      },
      proposal: { select: { id: true, proposalNumber: true, title: true } },
      projectManager: { select: { id: true, name: true, designation: true } },
      members: {
        include: { user: { select: { id: true, name: true, designation: true } } },
        orderBy: { assignedAt: "asc" },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      },
      activities: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) return null;
  return {
    ...project,
    projectCode: formatProjectCode(project.projectNumber),
    budgetAmount: actor.canViewBudget ? project.budgetAmount?.toNumber() ?? null : null,
    internalNotes: actor.canManageProjects ? project.internalNotes : null,
    proposalSnapshot: project.proposalSnapshot,
    tasks: project.tasks
      .filter((task) => actor.canReadAll || task.assigneeId === actor.id)
      .map((task) => ({
      ...task,
      projectCode: undefined,
      })),
  };
}

export async function getProjectFormOptions(userIds: string[] = []) {
  const [customers, users] = await prisma.$transaction([
    prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, displayName: true, companyName: true },
      orderBy: { displayName: "asc" },
      take: 250,
    }),
    prisma.user.findMany({
      where: {
        id: { in: userIds },
        banned: { not: true },
        employmentStatus: EmploymentStatus.ACTIVE,
      },
      select: { id: true, name: true, designation: true, department: true },
    }),
  ]);
  return { customers, users };
}

const projectUserPageSize = 20;

export async function getProjectUserPage(search: string, page: number) {
  const where: Prisma.UserWhereInput = {
    banned: { not: true },
    employmentStatus: EmploymentStatus.ACTIVE,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { designation: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, designation: true, department: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: page * projectUserPageSize,
    take: projectUserPageSize + 1,
  });
  const hasMore = users.length > projectUserPageSize;
  return {
    users: users.slice(0, projectUserPageSize),
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
}

export async function getProposalForConversion(proposalId: string) {
  return prisma.proposal.findFirst({
    where: { id: proposalId, status: "ACCEPTED" },
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      status: true,
      customerId: true,
      customerDisplayName: true,
      customerCompanyName: true,
      notes: true,
      currency: true,
      exchangeRate: true,
      subtotal: true,
      discount: true,
      tax: true,
      roundOff: true,
      grandTotal: true,
      acceptedAt: true,
      proposalBlocks: {
        where: { isVisible: true },
        orderBy: { sortOrder: "asc" },
        select: { type: true, title: true, content: true, sortOrder: true },
      },
      proposalServices: {
        orderBy: { sortOrder: "asc" },
        select: {
          serviceName: true,
          packageName: true,
          description: true,
          notes: true,
          items: {
            orderBy: { sortOrder: "asc" },
            select: {
              name: true,
              description: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              total: true,
              billingCycle: true,
            },
          },
          features: {
            orderBy: { sortOrder: "asc" },
            select: { content: true, isHeading: true },
          },
        },
      },
    },
  });
}

export async function getProjectByProposalId(proposalId: string) {
  return prisma.project.findUnique({
    where: { proposalId },
    select: { id: true, projectNumber: true, proposalId: true },
  });
}

export async function getCustomerForProject(customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, deletedAt: null },
    select: {
      id: true,
      displayName: true,
      companyName: true,
      primaryContactName: true,
      primaryContactEmail: true,
      primaryContactPhone: true,
    },
  });
}

export async function getRelatedInvoicesForProject(
  customerId: string | null,
  proposalId: string | null,
) {
  const relatedRecords: Prisma.InvoiceWhereInput[] = [];
  if (customerId) relatedRecords.push({ customerId });
  if (proposalId) relatedRecords.push({ proposalId });
  if (!relatedRecords.length) return [];

  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, OR: relatedRecords },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      dueDate: true,
      currency: true,
      grandTotal: true,
    },
    orderBy: [{ issueDate: "desc" }, { invoiceNumber: "desc" }],
    take: 10,
  });
  return invoices.map((invoice) => ({
    ...invoice,
    grandTotal: invoice.grandTotal.toNumber(),
  }));
}

export async function getUsersByIds(userIds: string[]) {
  return prisma.user.findMany({
    where: {
      id: { in: userIds },
      banned: { not: true },
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    select: { id: true },
  });
}

export type NewProjectData = {
  name: string;
  customerId?: string | null;
  description?: string | null;
  objectives?: string | null;
  scope?: string | null;
  internalNotes?: string | null;
  projectManagerId?: string | null;
  teamMemberIds: string[];
  startDate?: Date | null;
  dueDate?: Date | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  budgetAmount?: number;
  currency: string;
};

export async function createProjectRecord(
  input: NewProjectData,
  actorId: string,
  proposal?: { id: string; snapshot: Prisma.InputJsonValue },
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        customerId: input.customerId || null,
        proposalId: proposal?.id ?? null,
        proposalSnapshot: proposal?.snapshot ?? Prisma.JsonNull,
        description: input.description || null,
        objectives: input.objectives || null,
        scope: input.scope || null,
        internalNotes: input.internalNotes || null,
        projectManagerId: input.projectManagerId || null,
        startDate: input.startDate || null,
        dueDate: input.dueDate || null,
        priority: input.priority,
        status: input.status,
        budgetAmount: input.budgetAmount === undefined ? null : new Prisma.Decimal(input.budgetAmount),
        currency: input.currency,
        createdById: actorId,
        members: {
          create: input.teamMemberIds.map((userId) => ({ userId })),
        },
        activities: {
          create: {
            actorId,
            type: proposal ? "PROPOSAL_CONVERTED" : "CREATED",
            message: proposal ? "Converted from an accepted proposal" : "Project created",
            metadata: proposal ? { proposalId: proposal.id } : Prisma.JsonNull,
          },
        },
      },
      select: { id: true, projectNumber: true, proposalId: true },
    });
    return project;
  });
}

export async function createConvertedProjectRecord(
  proposalId: string,
  input: NewProjectData,
  actorId: string,
  snapshot: Prisma.InputJsonValue,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.project.findUnique({
      where: { proposalId },
      select: { id: true, projectNumber: true, proposalId: true },
    });
    if (existing) return { project: existing, created: false };

    const proposal = await tx.proposal.findUnique({
      where: { id: proposalId },
      select: { status: true },
    });
    if (!proposal || proposal.status !== "ACCEPTED") {
      return { project: null, created: false };
    }
    const project = await tx.project.create({
      data: {
        name: input.name,
        customerId: input.customerId || null,
        proposalId,
        proposalSnapshot: snapshot,
        description: input.description || null,
        objectives: input.objectives || null,
        scope: input.scope || null,
        internalNotes: input.internalNotes || null,
        projectManagerId: input.projectManagerId || null,
        startDate: input.startDate || null,
        dueDate: input.dueDate || null,
        priority: input.priority,
        status: input.status,
        budgetAmount: input.budgetAmount === undefined ? null : new Prisma.Decimal(input.budgetAmount),
        currency: input.currency,
        createdById: actorId,
        members: { create: input.teamMemberIds.map((userId) => ({ userId })) },
        activities: {
          create: {
            actorId,
            type: "PROPOSAL_CONVERTED",
            message: "Converted from an accepted proposal",
            metadata: { proposalId },
          },
        },
      },
      select: { id: true, projectNumber: true, proposalId: true },
    });
    return { project, created: true };
  });
}

export type ProjectChanges = Partial<Omit<NewProjectData, "teamMemberIds" | "status">> & {
  teamMemberIds?: string[];
};

export async function updateProjectRecord(
  projectId: string,
  changes: ProjectChanges,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const currentMembers = changes.teamMemberIds === undefined
      ? []
      : await tx.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      });
    const currentIds = new Set(currentMembers.map(({ userId }) => userId));
    const desiredIds = new Set(changes.teamMemberIds ?? []);
    const toRemove = [...currentIds].filter((userId) => !desiredIds.has(userId));
    const toAdd = [...desiredIds].filter((userId) => !currentIds.has(userId));

    await tx.project.update({
      where: { id: projectId, deletedAt: null },
      data: {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.customerId !== undefined ? { customerId: changes.customerId || null } : {}),
        ...(changes.description !== undefined ? { description: changes.description || null } : {}),
        ...(changes.objectives !== undefined ? { objectives: changes.objectives || null } : {}),
        ...(changes.scope !== undefined ? { scope: changes.scope || null } : {}),
        ...(changes.internalNotes !== undefined ? { internalNotes: changes.internalNotes || null } : {}),
        ...(changes.projectManagerId !== undefined ? { projectManagerId: changes.projectManagerId || null } : {}),
        ...(changes.startDate !== undefined ? { startDate: changes.startDate || null } : {}),
        ...(changes.dueDate !== undefined ? { dueDate: changes.dueDate || null } : {}),
        ...(changes.priority !== undefined ? { priority: changes.priority } : {}),
        ...(changes.currency !== undefined ? { currency: changes.currency } : {}),
        ...(changes.budgetAmount !== undefined
          ? { budgetAmount: changes.budgetAmount === null ? null : new Prisma.Decimal(changes.budgetAmount) }
          : {}),
      },
    });
    if (toRemove.length) {
      await tx.projectMember.deleteMany({ where: { projectId, userId: { in: toRemove } } });
    }
    if (toAdd.length) {
      await tx.projectMember.createMany({
        data: toAdd.map((userId) => ({ projectId, userId })),
      });
    }
    const teamChanged = toAdd.length > 0 || toRemove.length > 0;
    await tx.projectActivity.create({
      data: {
        projectId,
        actorId,
        type:
          !teamChanged
            ? "DETAILS_UPDATED"
            : toAdd.length
              ? "TEAM_MEMBER_ADDED"
              : "TEAM_MEMBER_REMOVED",
        message: teamChanged ? "Project team updated" : "Project details updated",
        metadata: {
          addedUserIds: toAdd,
          removedUserIds: toRemove,
        },
      },
    });
    return tx.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { id: true, projectNumber: true },
    });
  });
}

export async function updateProjectStatusRecord(
  projectId: string,
  status: ProjectStatus,
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { status: true },
    });
    if (!current) return null;
    await tx.project.update({
      where: { id: projectId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
    await tx.projectActivity.create({
      data: {
        projectId,
        actorId,
        type: "STATUS_CHANGED",
        message: `Project status changed from ${current.status.replaceAll("_", " ")} to ${status.replaceAll("_", " ")}`,
        metadata: { from: current.status, to: status },
      },
    });
    return { id: projectId, status };
  });
}

export async function getProjectStatus(projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { status: true },
  });
}

export async function archiveProjectRecord(projectId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await tx.projectActivity.create({
      data: {
        projectId,
        actorId,
        type: "DETAILS_UPDATED",
        message: "Project archived",
      },
    });
  });
}

export async function createProjectTaskRecord(
  input: {
    projectId: string;
    title: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    priority: ProjectPriority;
  },
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.create({
      data: {
        ...input,
        description: input.description || null,
        assigneeId: input.assigneeId || null,
        dueDate: input.dueDate || null,
        createdById: actorId,
      },
      select: { id: true, title: true },
    });
    await tx.projectActivity.create({
      data: {
        projectId: input.projectId,
        actorId,
        type: "TASK_CREATED",
        message: `Task added: ${input.title}`,
        metadata: { taskId: task.id },
      },
    });
    return task;
  });
}

export async function findTaskForProject(taskId: string) {
  return prisma.projectTask.findFirst({
    where: { id: taskId, project: { deletedAt: null } },
    select: { id: true, projectId: true, assigneeId: true, status: true, title: true },
  });
}

export async function updateProjectTaskRecord(
  taskId: string,
  changes: {
    status?: ProjectTaskStatus;
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    priority?: ProjectPriority;
  },
  actorId: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.projectTask.findUniqueOrThrow({
      where: { id: taskId },
      select: { projectId: true, status: true, title: true },
    });
    const updated = await tx.projectTask.update({
      where: { id: taskId },
      data: {
        ...changes,
        ...(changes.status !== undefined
          ? { completedAt: changes.status === "DONE" ? new Date() : null }
          : {}),
      },
    });
    await tx.projectActivity.create({
      data: {
        projectId: current.projectId,
        actorId,
        type: "TASK_UPDATED",
        message: changes.status
          ? `Task "${current.title}" status changed to ${changes.status.replaceAll("_", " ")}`
          : `Task updated: ${current.title}`,
        metadata: { taskId, from: current.status, to: changes.status ?? current.status },
      },
    });
    return updated;
  });
}

export async function getProjectAssignment(projectId: string, userId: string) {
  const activeUser = await prisma.user.findFirst({
    where: {
      id: userId,
      banned: { not: true },
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    select: { id: true },
  });
  if (!activeUser) return null;

  return prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      OR: [
        { projectManagerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
}

export async function getTaskProjectAssignment(taskId: string, userId: string) {
  return prisma.projectTask.findFirst({
    where: { id: taskId, assigneeId: userId, project: { deletedAt: null } },
    select: { id: true, projectId: true },
  });
}

export async function archiveTaskRecord(taskId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.findUniqueOrThrow({
      where: { id: taskId },
      select: { projectId: true, title: true },
    });
    await tx.projectTask.delete({ where: { id: taskId } });
    await tx.projectActivity.create({
      data: {
        projectId: task.projectId,
        actorId,
        type: "TASK_UPDATED",
        message: `Task removed: ${task.title}`,
        metadata: { taskId },
      },
    });
    return { projectId: task.projectId };
  });
}
