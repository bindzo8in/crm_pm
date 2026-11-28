import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { ProjectQuery } from "@/lib/schemas/project-schema";
import type { ProjectTaskWorkspaceQuery } from "@/lib/schemas/project-schema";
import { EmploymentStatus } from "@/app/generated/prisma/enums";
import { getAttendanceDate } from "@/lib/date";
import {
  parseTaskWorkflowStatuses,
  type TaskStatusGroup,
  type TaskWorkflowStatus,
} from "@/lib/task-status";
import type {
  ProjectPriority,
  ProjectStatus,
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

function taskAccessFilter(actor: {
  id: string;
  canReadAll: boolean;
  canReadAssigned?: boolean;
  canReadOwn?: boolean;
}): Prisma.ProjectTaskWhereInput {
  if (actor.canReadAll) return {};
  const conditions: Prisma.ProjectTaskWhereInput[] = [];
  if (actor.canReadAssigned || actor.canReadOwn) {
    conditions.push({ assigneeId: actor.id });
  }
  if (actor.canReadOwn) {
    conditions.push({ createdById: actor.id });
  }
  return conditions.length > 0 ? { OR: conditions } : { id: "__no_access__" };
}

function projectFilters(query: ProjectQuery): Prisma.ProjectWhereInput {
  const conditions: Prisma.ProjectWhereInput[] = [];

  if (query.status?.length) conditions.push({ status: { in: query.status } });
  if (query.priority?.length) conditions.push({ priority: { in: query.priority } });
  if (query.customerId) conditions.push({ customerId: query.customerId });
  if (query.projectManagerId?.length) {
    conditions.push({
      OR: [
        ...query.projectManagerId
          .filter((id) => id !== "unassigned")
          .map((id) => ({ projectManagerId: id })),
        ...(query.projectManagerId.includes("unassigned") ? [{ projectManagerId: null }] : []),
      ],
    });
  }
  if (query.memberId?.length) {
    conditions.push({ members: { some: { userId: { in: query.memberId } } } });
  }
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
  if (query.overdue === "true") {
    conditions.push({
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      dueDate: { lt: new Date(`${getAttendanceDate()}T00:00:00.000Z`) },
    });
  } else if (query.overdue === "false") {
    conditions.push({
      OR: [
        { dueDate: null },
        { dueDate: { gte: new Date(`${getAttendanceDate()}T00:00:00.000Z`) } },
        { status: { in: ["COMPLETED", "CANCELLED"] } },
      ],
    });
  }

  return conditions.length ? { AND: conditions } : {};
}

export async function getProjectPage(
  query: ProjectQuery,
  actor: {
    id: string;
    organizationId: string;
    canReadAll: boolean;
    canViewBudget: boolean;
  },
) {
  const filters = projectFilters(query);
  const accessFilter: Prisma.ProjectWhereInput = {
    organizationId: actor.organizationId,
    ...(!actor.canReadAll ? assignedProjectFilter(actor.id) : {}),
  };
  const today = new Date(`${getAttendanceDate()}T00:00:00.000Z`);
  const baseWhere: Prisma.ProjectWhereInput = {
    organizationId: actor.organizationId,
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

  const rawItems = await prisma.project.findMany({
    where: pageWhere,
    select: projectCardSelect,
    orderBy: [{ projectNumber: orderDirection }, { id: orderDirection }],
    take: query.pageSize + 1,
  });
  const [total, allCount, activeCount, onHoldCount, planningCount, upcomingCount, overdueCount, completedCount, projectManagers, teamMembers] =
    await prisma.$transaction(async (tx) => {
      const total = await tx.project.count({ where: baseWhere });
      const allCount = await tx.project.count({ where: { ...accessFilter, deletedAt: null } });
      const activeCount = await tx.project.count({
        where: {
          ...accessFilter,
          deletedAt: null,
          status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        },
      });
      const onHoldCount = await tx.project.count({
        where: { ...accessFilter, deletedAt: null, status: "ON_HOLD" },
      });
      const planningCount = await tx.project.count({
        where: { ...accessFilter, deletedAt: null, status: "PLANNING" },
      });
      const upcomingCount = await tx.project.count({
        where: {
          ...accessFilter,
          deletedAt: null,
          status: { in: ["PLANNING", "NOT_STARTED", "IN_PROGRESS", "ON_HOLD"] },
          dueDate: { gte: today, lte: new Date(today.getTime() + 7 * 86400000) },
        },
      });
      const overdueCount = await tx.project.count({
        where: {
          ...accessFilter,
          deletedAt: null,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          dueDate: { lt: today },
        },
      });
      const completedCount = await tx.project.count({
        where: { ...accessFilter, deletedAt: null, status: "COMPLETED" },
      });
      const projectManagers = await tx.user.findMany({
        where: {
          managedProjects: {
            some: { deletedAt: null, organizationId: actor.organizationId },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      });
      const teamMembers = await tx.user.findMany({
        where: {
          projectMemberships: {
            some: {
              project: { deletedAt: null, organizationId: actor.organizationId },
            },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      });

      return [
        total,
        allCount,
        activeCount,
        onHoldCount,
        planningCount,
        upcomingCount,
        overdueCount,
        completedCount,
        projectManagers,
        teamMembers,
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
      onHold: onHoldCount,
      planning: planningCount,
      dueSoon: upcomingCount,
      overdue: overdueCount,
      completed: completedCount,
    },
    filters: {
      projectManagers,
      teamMembers,
    },
  };
}

export async function getProjectTaskWorkspacePage(
  query: ProjectTaskWorkspaceQuery,
  actor: {
    id: string;
    organizationId: string;
    canReadAll: boolean;
    canReadAssigned: boolean;
    canReadOwn: boolean;
  },
) {
  const today = new Date(`${getAttendanceDate()}T00:00:00.000Z`);
  const nextWeek = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);
  const accessWhere: Prisma.ProjectTaskWhereInput = {
    project: { deletedAt: null, organizationId: actor.organizationId },
    ...taskAccessFilter(actor),
  };
  const filters: Prisma.ProjectTaskWhereInput[] = [];

  if (query.view === "assigned") filters.push({ assigneeId: actor.id });
  if (query.view === "created") filters.push({ createdById: actor.id });
  if (query.view === "upcoming") {
    filters.push({
      dueDate: { gte: today, lt: nextWeek },
      statusGroup: { notIn: ["DONE", "CLOSED"] },
    });
  }
  if (query.view === "overdue") {
    filters.push({
      dueDate: { lt: today },
      statusGroup: { notIn: ["DONE", "CLOSED"] },
    });
  }
  if (query.view === "completed") filters.push({ statusGroup: "DONE" });
  if (query.status?.length) {
    filters.push({
      OR: query.status.map((selection) => {
        const separator = selection.indexOf(":");
        if (separator < 0) return { status: selection };
        return {
          projectId: selection.slice(0, separator),
          status: selection.slice(separator + 1),
        };
      }),
    });
  }
  if (query.priority?.length) filters.push({ priority: { in: query.priority } });
  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { project: { name: { contains: query.search, mode: "insensitive" } } },
      ],
    });
  }

  const where: Prisma.ProjectTaskWhereInput = {
    AND: [accessWhere, ...filters],
  };
  const taskListWhere: Prisma.ProjectTaskWhereInput = {
    AND: [
      {
        project: {
          deletedAt: null,
          organizationId: actor.organizationId,
        },
        parentTaskId: null,
      },
      {
        OR: [
          where,
          {
            subtasks: {
              some: where,
            },
          },
        ],
      },
    ],
  };
  const [tasks, total, statusCounts, overdueCount] = await Promise.all([
    prisma.projectTask.findMany({
      where: taskListWhere,
      select: {
        id: true,
        title: true,
        description: true,
        folderId: true,
        status: true,
        statusGroup: true,
        priority: true,
        startDate: true,
        dueDate: true,
        timeEstimateMinutes: true,
        sprintPoints: true,
        timeTrackedSeconds: true,
        createdAt: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true, role: true, department: true } },
        createdBy: { select: { id: true, name: true } },
        subtasks: {
          where,
          select: {
            id: true,
            title: true,
            status: true,
            statusGroup: true,
            assigneeId: true,
            assignee: {
              select: { id: true, name: true, role: true, department: true },
            },
            dueDate: true,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        project: {
          select: {
            id: true,
            name: true,
            projectNumber: true,
            projectManager: { select: { id: true, name: true, role: true, department: true } },
            members: {
              select: {
                user: {
                  select: { id: true, name: true, role: true, department: true },
                },
              },
              orderBy: { assignedAt: "asc" },
            },
            taskStatuses: true,
            taskFolders: {
              select: { id: true, name: true, parentId: true },
              orderBy: [{ parentId: "asc" }, { name: "asc" }],
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      take: query.pageSize + 1,
    }),
    prisma.projectTask.count({ where: taskListWhere }),
    prisma.projectTask.groupBy({
      by: ["statusGroup"],
      where: accessWhere,
      _count: { _all: true },
    }),
    prisma.projectTask.count({
      where: {
        ...accessWhere,
        dueDate: { lt: today },
        statusGroup: { notIn: ["DONE", "CLOSED"] },
      },
    }),
  ]);
  const hasMore = tasks.length > query.pageSize;
  const pageTasks = tasks.slice(0, query.pageSize);
  const summary = statusCounts.reduce(
    (counts, row) => {
      counts.total += row._count._all;
      if (row.statusGroup !== "DONE" && row.statusGroup !== "CLOSED") {
        counts.open += row._count._all;
      }
      if (row.statusGroup === "ACTIVE") counts.active += row._count._all;
      if (row.statusGroup === "DONE") counts.completed += row._count._all;
      return counts;
    },
    { total: 0, open: 0, active: 0, completed: 0, overdue: overdueCount },
  );

  return {
    items: pageTasks.map((task) => ({
      ...task,
      project: {
        ...task.project,
        taskStatuses: parseTaskWorkflowStatuses(task.project.taskStatuses),
      },
      projectCode: formatProjectCode(task.project.projectNumber),
    })),
    total,
    nextCursor: hasMore ? pageTasks.at(-1)?.id ?? null : null,
    summary,
  };
}

export async function getTaskCreationProjectOptions(
  organizationId: string,
  userId: string,
  canReadAllProjects: boolean,
) {
  const projects = await prisma.project.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(!canReadAllProjects ? assignedProjectFilter(userId) : {}),
    },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      projectManager: { select: { id: true, name: true } },
      members: {
        select: { user: { select: { id: true, name: true } } },
        orderBy: { assignedAt: "asc" },
      },
      taskStatuses: true,
      taskFolders: {
        select: { id: true, name: true, parentId: true },
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
      },
    },
    orderBy: { projectNumber: "desc" },
    take: 101,
  });
  const hasMore = projects.length > 100;
  return {
    items: projects.slice(0, 100).map((project) => ({
      id: project.id,
      name: project.name,
      projectCode: formatProjectCode(project.projectNumber),
      projectManager: project.projectManager,
      members: project.members.map(({ user }) => user),
      taskStatuses: parseTaskWorkflowStatuses(project.taskStatuses),
      taskFolders: project.taskFolders,
    })),
    hasMore,
  };
}

export function formatProjectCode(projectNumber: number) {
  return `PRJ-${String(projectNumber).padStart(5, "0")}`;
}

export async function getProjectById(
  projectId: string,
  actor: {
    id: string;
    organizationId: string;
    canReadAll: boolean;
    canViewBudget: boolean;
    canManageProjects: boolean;
  },
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: actor.organizationId,
      deletedAt: null,
      ...(actor.canReadAll ? {} : assignedProjectFilter(actor.id)),
    },
    include: {
      customer: {
        select: {
          id: true,
          customerNumber: true,
          displayName: true,
          companyName: true,
          primaryContactName: true,
          primaryContactEmail: true,
          primaryContactPhone: true,
          deletedAt: true,
        },
      },
      proposal: { select: { id: true, proposalNumber: true, title: true } },
      projectManager: { select: { id: true, name: true, image: true, designation: true } },
      members: {
        include: { user: { select: { id: true, name: true, image: true, designation: true } } },
        orderBy: { assignedAt: "asc" },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      },
      taskFolders: {
        select: { id: true, name: true, parentId: true },
        orderBy: [{ parentId: "asc" }, { name: "asc" }],
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
    taskStatuses: parseTaskWorkflowStatuses(project.taskStatuses),
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

export async function getProjectFormOptions(
  organizationId: string,
  userIds: string[] = [],
) {
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      organizationMemberships: { some: { organizationId } },
      banned: { not: true },
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      designation: true,
      department: true,
      additionalDepartments: true,
    },
  });
  return { users };
}

export async function getProjectTeamById(projectId: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      projectManager: {
        select: {
          id: true,
          name: true,
          designation: true,
          department: true,
          additionalDepartments: true,
        },
      },
      members: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              designation: true,
              department: true,
              additionalDepartments: true,
            },
          },
        },
        orderBy: { assignedAt: "asc" },
      },
    },
  });
}

const projectUserPageSize = 20;

export async function getProjectUserPage(
  organizationId: string,
  search: string,
  page: number,
) {
  const where: Prisma.UserWhereInput = {
    organizationMemberships: { some: { organizationId } },
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
    select: {
      id: true,
      name: true,
      designation: true,
      department: true,
      additionalDepartments: true,
    },
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

export async function getProposalForConversion(
  proposalId: string,
  organizationId: string,
) {
  return prisma.proposal.findFirst({
    where: { id: proposalId, organizationId, status: "ACCEPTED" },
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

export async function getProjectByProposalId(proposalId: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { proposalId, organizationId },
    select: { id: true, projectNumber: true, proposalId: true },
  });
}

export async function getCustomerForProject(
  customerId: string,
  organizationId: string,
) {
  return prisma.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
    select: {
      id: true,
      customerNumber: true,
      displayName: true,
      companyName: true,
      primaryContactName: true,
      primaryContactEmail: true,
      primaryContactPhone: true,
    },
  });
}

export async function getRelatedInvoicesForProject(
  organizationId: string,
  customerId: string | null,
  proposalId: string | null,
) {
  const relatedRecords: Prisma.InvoiceWhereInput[] = [];
  if (customerId) relatedRecords.push({ customerId });
  if (proposalId) relatedRecords.push({ proposalId });
  if (!relatedRecords.length) return [];

  const invoices = await prisma.invoice.findMany({
    where: { organizationId, deletedAt: null, OR: relatedRecords },
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

export async function getUsersByIds(userIds: string[], organizationId: string) {
  return prisma.user.findMany({
    where: {
      id: { in: userIds },
      organizationMemberships: { some: { organizationId } },
      banned: { not: true },
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    select: { id: true },
  });
}

export type NewProjectData = {
  organizationId: string;
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
  taskStatuses: Prisma.InputJsonValue;
  workflowTemplateId: string;
};

export async function createProjectRecord(
  input: NewProjectData,
  actorId: string,
  proposal?: { id: string; snapshot: Prisma.InputJsonValue },
) {
  return prisma.$transaction(async (tx) => {
    const memberIds = [...new Set([
      actorId,
      ...(input.projectManagerId ? [input.projectManagerId] : []),
      ...input.teamMemberIds,
    ])];
    const project = await tx.project.create({
      data: {
        organizationId: input.organizationId,
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
        taskStatuses: input.taskStatuses,
        workflowTemplateId: input.workflowTemplateId,
        budgetAmount: input.budgetAmount === undefined ? null : new Prisma.Decimal(input.budgetAmount),
        currency: input.currency,
        createdById: actorId,
        members: {
          create: memberIds.map((userId) => ({ userId })),
        },
        activities: {
          create: {
            actorId,
            type: proposal ? "PROPOSAL_CONVERTED" : "CREATED",
            message: proposal ? "Converted from an accepted proposal" : "Project created",
            metadata: proposal ? { proposalId: proposal.id } : Prisma.JsonNull,
          },
        },
        taskFolders: { create: { name: "General" } },
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
    const existing = await tx.project.findFirst({
      where: { proposalId, organizationId: input.organizationId },
      select: { id: true, projectNumber: true, proposalId: true },
    });
    if (existing) return { project: existing, created: false };

    const proposal = await tx.proposal.findFirst({
      where: { id: proposalId, organizationId: input.organizationId },
      select: { status: true },
    });
    if (!proposal || proposal.status !== "ACCEPTED") {
      return { project: null, created: false };
    }
    const project = await tx.project.create({
      data: {
        organizationId: input.organizationId,
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
        taskStatuses: input.taskStatuses,
        workflowTemplateId: input.workflowTemplateId,
        budgetAmount: input.budgetAmount === undefined ? null : new Prisma.Decimal(input.budgetAmount),
        currency: input.currency,
        createdById: actorId,
        members: {
          create: [...new Set([
            actorId,
            ...(input.projectManagerId ? [input.projectManagerId] : []),
            ...input.teamMemberIds,
          ])].map((userId) => ({ userId })),
        },
        activities: {
          create: {
            actorId,
            type: "PROPOSAL_CONVERTED",
            message: "Converted from an accepted proposal",
            metadata: { proposalId },
          },
        },
        taskFolders: { create: { name: "General" } },
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
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const currentProjectManager = changes.projectManagerId === undefined
      ? null
      : await tx.project.findFirst({
        where: { id: projectId, organizationId, deletedAt: null },
        select: { projectManagerId: true },
      });
    const currentMembers = changes.teamMemberIds === undefined
      ? []
      : await tx.projectMember.findMany({
        where: { projectId, project: { organizationId } },
        select: { userId: true },
      });
    const currentIds = new Set(currentMembers.map(({ userId }) => userId));
    const desiredIds = new Set(changes.teamMemberIds ?? []);
    const toRemove = [...currentIds].filter((userId) => !desiredIds.has(userId));
    const toAdd = [...desiredIds].filter((userId) => !currentIds.has(userId));

    const updated = await tx.project.updateMany({
      where: { id: projectId, organizationId, deletedAt: null },
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
    if (updated.count !== 1) throw new Error("Project not found.");
    if (toRemove.length) {
      await tx.projectMember.deleteMany({
        where: {
          projectId,
          project: { organizationId },
          userId: { in: toRemove },
        },
      });
    }
    if (toAdd.length) {
      await tx.projectMember.createMany({
        data: toAdd.map((userId) => ({ projectId, userId })),
      });
    }
    const managerChanged = currentProjectManager !== null &&
      currentProjectManager.projectManagerId !== changes.projectManagerId;
    const teamChanged = managerChanged || toAdd.length > 0 || toRemove.length > 0;
    await tx.projectActivity.create({
      data: {
        projectId,
        actorId,
        type:
          !teamChanged
            ? "DETAILS_UPDATED"
            : toAdd.length
              ? "TEAM_MEMBER_ADDED"
                : toRemove.length
                  ? "TEAM_MEMBER_REMOVED"
                  : "DETAILS_UPDATED",
        message: teamChanged ? "Project team updated" : "Project details updated",
        metadata: {
          addedUserIds: toAdd,
          removedUserIds: toRemove,
          ...(managerChanged
              ? {
                previousProjectManagerId: currentProjectManager.projectManagerId,
                projectManagerId: changes.projectManagerId,
              }
              : {}),
        },
      },
    });
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, projectNumber: true },
    });
    if (!project) throw new Error("Project not found.");
    return project;
  });
}

export async function updateProjectStatusRecord(
  projectId: string,
  status: ProjectStatus,
  actorId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { status: true },
    });
    if (!current) return null;
    const updated = await tx.project.updateMany({
      where: { id: projectId, organizationId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
    if (updated.count !== 1) return null;
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

export async function getProjectStatus(projectId: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: { status: true },
  });
}

export async function archiveProjectRecord(
  projectId: string,
  actorId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.project.updateMany({
      where: { id: projectId, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count !== 1) return false;
    await tx.projectActivity.create({
      data: {
        projectId,
        actorId,
        type: "DETAILS_UPDATED",
        message: "Project archived",
      },
    });
    return true;
  });
}

export async function createProjectTaskRecord(
  input: {
    projectId: string;
    title: string;
    status: string;
    statusGroup: TaskStatusGroup;
    description?: string | null;
    assigneeId?: string | null;
    startDate?: Date | null;
    dueDate?: Date | null;
    priority: ProjectPriority;
    timeEstimateMinutes?: number | null;
    sprintPoints?: number | null;
    parentTaskId?: string | null;
    folderId: string;
  },
  actorId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: {
        id: input.projectId,
        organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!project) throw new Error("Project not found.");

    const task = await tx.projectTask.create({
      data: {
        ...input,
        description: input.description || null,
        assigneeId: input.assigneeId || null,
        startDate: input.startDate || null,
        dueDate: input.dueDate || null,
        timeEstimateMinutes: input.timeEstimateMinutes ?? null,
        sprintPoints: input.sprintPoints ?? null,
        parentTaskId: input.parentTaskId ?? null,
        folderId: input.folderId,
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

export async function getProjectTaskFolders(
  projectId: string,
  organizationId: string,
) {
  return prisma.projectTaskFolder.findMany({
    where: { projectId, project: { organizationId } },
    select: { id: true, projectId: true, name: true, parentId: true },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  });
}

export async function getProjectTaskFolder(
  folderId: string,
  organizationId: string,
) {
  return prisma.projectTaskFolder.findFirst({
    where: { id: folderId, project: { organizationId } },
    select: { id: true, projectId: true, name: true, parentId: true },
  });
}

export async function createProjectTaskFolderRecord(input: {
  organizationId: string;
  projectId: string;
  name: string;
  parentId: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: {
        id: input.projectId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!project) throw new Error("Project not found.");
    if (input.parentId) {
      const parent = await tx.projectTaskFolder.findFirst({
        where: {
          id: input.parentId,
          projectId: input.projectId,
          project: { organizationId: input.organizationId },
        },
        select: { id: true },
      });
      if (!parent) throw new Error("Parent folder not found.");
    }
    return tx.projectTaskFolder.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        parentId: input.parentId,
      },
      select: { id: true, name: true, parentId: true },
    });
  });
}

export async function updateProjectTaskFolderRecord(input: {
  organizationId: string;
  projectId: string;
  folderId: string;
  name: string;
  parentId: string | null;
}) {
  const result = await prisma.$transaction(async (tx) => {
    if (input.parentId) {
      const parent = await tx.projectTaskFolder.findFirst({
        where: {
          id: input.parentId,
          projectId: input.projectId,
          project: { organizationId: input.organizationId },
        },
        select: { id: true },
      });
      if (!parent) throw new Error("Parent folder not found.");
    }
    return tx.projectTaskFolder.updateMany({
      where: {
        id: input.folderId,
        projectId: input.projectId,
        project: { organizationId: input.organizationId },
      },
      data: { name: input.name, parentId: input.parentId },
    });
  });
  if (result.count !== 1) throw new Error("Folder not found.");
  return prisma.projectTaskFolder.findFirstOrThrow({
    where: {
      id: input.folderId,
      projectId: input.projectId,
      project: { organizationId: input.organizationId },
    },
    select: { id: true, name: true, parentId: true },
  });
}

export async function deleteProjectTaskFolderRecord(
  projectId: string,
  folderId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const folder = await tx.projectTaskFolder.findFirst({
      where: {
        id: folderId,
        projectId,
        project: { organizationId },
      },
      select: { id: true, name: true, parentId: true },
    });
    if (!folder) return false;

    let destinationId = folder.parentId;
    if (!destinationId) {
      const sibling = await tx.projectTaskFolder.findFirst({
        where: {
          projectId,
          parentId: null,
          id: { not: folderId },
          project: { organizationId },
        },
        select: { id: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      destinationId = sibling?.id ?? null;
    }

    if (!destinationId) {
      const replacement = await tx.projectTaskFolder.create({
        data: { projectId, name: "General" },
        select: { id: true },
      });
      destinationId = replacement.id;
    }

    await tx.projectTask.updateMany({
      where: { projectId, folderId, project: { organizationId } },
      data: { folderId: destinationId },
    });
    await tx.projectTaskFolder.updateMany({
      where: {
        projectId,
        parentId: folderId,
        project: { organizationId },
      },
      data: { parentId: destinationId },
    });
    await tx.projectTaskFolder.deleteMany({
      where: {
        id: folderId,
        projectId,
        project: { organizationId },
      },
    });
    return true;
  });
}

export async function findTaskForProject(taskId: string, organizationId: string) {
  return prisma.projectTask.findFirst({
    where: {
      id: taskId,
      project: { organizationId, deletedAt: null },
    },
    select: {
      id: true,
      projectId: true,
      assigneeId: true,
      createdById: true,
      status: true,
      title: true,
      parentTaskId: true,
      folderId: true,
      startDate: true,
      dueDate: true,
    },
  });
}

export async function updateProjectTaskRecord(
  taskId: string,
  changes: {
    status?: string;
    statusGroup?: TaskStatusGroup;
    statusLabel?: string;
    folderId?: string;
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    startDate?: Date | null;
    dueDate?: Date | null;
    priority?: ProjectPriority;
    timeEstimateMinutes?: number | null;
    sprintPoints?: number | null;
  },
  actorId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.projectTask.findFirst({
      where: { id: taskId, project: { organizationId } },
      select: { projectId: true, status: true, statusGroup: true, title: true },
    });
    if (!current) throw new Error("Task not found.");
    const { statusLabel, ...taskChanges } = changes;
    const updateResult = await tx.projectTask.updateMany({
      where: { id: taskId, project: { organizationId } },
      data: {
        ...taskChanges,
        ...(changes.statusGroup !== undefined && changes.statusGroup !== current.statusGroup
          ? { completedAt: changes.statusGroup === "DONE" ? new Date() : null }
          : {}),
      },
    });
    if (updateResult.count !== 1) throw new Error("Task not found.");
    await tx.projectActivity.create({
      data: {
        projectId: current.projectId,
        actorId,
        type: "TASK_UPDATED",
        message: changes.status
          ? `Task "${current.title}" status changed to ${statusLabel ?? changes.status.replaceAll("_", " ")}`
          : `Task updated: ${current.title}`,
        metadata: { taskId, from: current.status, to: changes.status ?? current.status },
      },
    });
    const updatedTask = await tx.projectTask.findFirst({
      where: { id: taskId, project: { organizationId } },
    });
    if (!updatedTask) throw new Error("Task not found.");
    return updatedTask;
  });
}

export async function getProjectTaskWorkflow(
  projectId: string,
  organizationId: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    select: { id: true, taskStatuses: true, workflowTemplateId: true },
  });
  if (!project) return null;
  return {
    ...project,
    taskStatuses: parseTaskWorkflowStatuses(project.taskStatuses),
  };
}

export async function getProjectTaskPreview(
  taskId: string,
  actor: {
    id: string;
    organizationId: string;
    canReadAll: boolean;
    canReadAssigned?: boolean;
    canReadOwn?: boolean;
  },
) {
  const task = await prisma.projectTask.findFirst({
    where: {
      id: taskId,
      project: {
        organizationId: actor.organizationId,
        deletedAt: null,
      },
      ...taskAccessFilter(actor),
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      status: true,
      statusGroup: true,
      priority: true,
      startDate: true,
      dueDate: true,
      timeEstimateMinutes: true,
      sprintPoints: true,
      timeTrackedSeconds: true,
      parentTaskId: true,
      createdAt: true,
      updatedAt: true,
      assigneeId: true,
      assignee: {
        select: { id: true, name: true, image: true, role: true, department: true },
      },
      createdBy: { select: { id: true, name: true } },
      parentTask: { select: { id: true, title: true } },
      project: {
        select: {
          id: true,
          name: true,
          projectNumber: true,
          taskStatuses: true,
          projectManager: {
            select: { id: true, name: true, role: true, department: true },
          },
          members: {
            select: {
              user: {
                select: { id: true, name: true, role: true, department: true },
              },
            },
            orderBy: { assignedAt: "asc" },
          },
          tasks: {
            where: {
              id: { not: taskId },
              parentTaskId: null,
              ...taskAccessFilter(actor),
            },
            select: { id: true, title: true, status: true, statusGroup: true },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 100,
          },
        },
      },
      subtasks: {
        where: taskAccessFilter(actor),
        select: {
          id: true,
          title: true,
          status: true,
          statusGroup: true,
          assignee: { select: { id: true, name: true } },
          dueDate: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      dependencies: {
        where: {
          dependsOnTask: {
            project: { organizationId: actor.organizationId },
            ...(!actor.canReadAll
              ? taskAccessFilter(actor)
              : {}),
          },
        },
        select: {
          id: true,
          relationType: true,
          dependsOnTask: {
            select: { id: true, title: true, status: true, statusGroup: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      blockedTasks: {
        where: {
          relationType: "BLOCKED_BY",
          task: {
            project: { organizationId: actor.organizationId },
            ...(!actor.canReadAll ? taskAccessFilter(actor) : {}),
          },
        },
        select: {
          id: true,
          task: { select: { id: true, title: true, status: true, statusGroup: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      checklist: {
        select: { id: true, title: true, isComplete: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      attachments: {
        select: {
          id: true,
          url: true,
          publicId: true,
          resourceType: true,
          fileName: true,
          fileSize: true,
          uploadedBy: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      timeEntries: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          durationSeconds: true,
          userId: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 50,
      },
    },
  });
  if (!task) throw new Error("Task not found.");
  const { tasks: availableDependencies, ...project } = task.project;
  return {
    ...task,
    project: {
      ...project,
      projectCode: formatProjectCode(project.projectNumber),
      taskStatuses: parseTaskWorkflowStatuses(project.taskStatuses),
      availableDependencies,
    },
  };
}

export async function createTaskChecklistItem(
  taskId: string,
  title: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.findFirst({
      where: { id: taskId, project: { organizationId } },
      select: { id: true },
    });
    if (!task) throw new Error("Task not found.");
    const lastItem = await tx.projectTaskChecklistItem.findFirst({
      where: { taskId, task: { project: { organizationId } } },
      select: { sortOrder: true },
      orderBy: { sortOrder: "desc" },
    });
    return tx.projectTaskChecklistItem.create({
      data: { taskId, title, sortOrder: (lastItem?.sortOrder ?? -1) + 1 },
      select: { id: true, title: true, isComplete: true, sortOrder: true },
    });
  });
}

export async function updateTaskChecklistItem(
  taskId: string,
  itemId: string,
  isComplete: boolean,
  organizationId: string,
) {
  const result = await prisma.projectTaskChecklistItem.updateMany({
    where: { id: itemId, taskId, task: { project: { organizationId } } },
    data: { isComplete },
  });
  return result.count > 0;
}

export async function deleteTaskChecklistItem(
  taskId: string,
  itemId: string,
  organizationId: string,
) {
  const result = await prisma.projectTaskChecklistItem.deleteMany({
    where: { id: itemId, taskId, task: { project: { organizationId } } },
  });
  return result.count > 0;
}

export async function getTaskDependencyGraph(
  projectId: string,
  organizationId: string,
) {
  return prisma.projectTask.findMany({
    where: { projectId, project: { organizationId } },
    select: {
      id: true,
      dependencies: { select: { dependsOnTaskId: true, relationType: true } },
    },
  });
}

export async function createTaskDependency(
  taskId: string,
  dependsOnTaskId: string,
  relationType: "BLOCKED_BY" | "RELATED_TO",
  organizationId: string,
) {
  const foundTasks = await prisma.projectTask.findMany({
    where: {
      id: { in: [taskId, dependsOnTaskId] },
      project: { organizationId },
    },
    select: { id: true, projectId: true },
  });
  const task = foundTasks.find(({ id }) => id === taskId);
  const dependency = foundTasks.find(({ id }) => id === dependsOnTaskId);
  if (
    !task ||
    !dependency ||
    task.id === dependency.id ||
    task.projectId !== dependency.projectId
  ) {
    throw new Error("Task not found in this organization.");
  }
  return prisma.projectTaskDependency.create({
    data: { taskId, dependsOnTaskId, relationType },
    select: { id: true },
  });
}

export async function deleteTaskDependency(
  taskId: string,
  dependencyId: string,
  organizationId: string,
) {
  const result = await prisma.projectTaskDependency.deleteMany({
    where: {
      id: dependencyId,
      taskId,
      task: { project: { organizationId } },
    },
  });
  return result.count > 0;
}

export async function createTaskAttachment(
  input: {
    taskId: string;
    url: string;
    publicId: string;
    resourceType: string;
    fileName: string;
    fileSize: number;
  },
  uploadedById: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.findFirst({
      where: {
        id: input.taskId,
        project: { organizationId },
      },
      select: { id: true },
    });
    if (!task) throw new Error("Task not found.");
    const count = await tx.projectTaskAttachment.count({
      where: {
        taskId: input.taskId,
        task: { project: { organizationId } },
      },
    });
    if (count >= 20) throw new Error("A task can have up to 20 attachments.");
    return tx.projectTaskAttachment.create({
      data: { ...input, uploadedById },
      select: { id: true },
    });
  });
}

export async function getTaskAttachment(
  taskId: string,
  attachmentId: string,
  organizationId: string,
) {
  return prisma.projectTaskAttachment.findFirst({
    where: {
      id: attachmentId,
      taskId,
      task: { project: { organizationId } },
    },
    select: { id: true, publicId: true, resourceType: true },
  });
}

export async function deleteTaskAttachment(
  taskId: string,
  attachmentId: string,
  organizationId: string,
) {
  const result = await prisma.projectTaskAttachment.deleteMany({
    where: {
      id: attachmentId,
      taskId,
      task: { project: { organizationId } },
    },
  });
  return result.count > 0;
}

export async function createTaskComment(
  taskId: string,
  authorId: string,
  content: string,
  organizationId: string,
) {
  const task = await prisma.projectTask.findFirst({
    where: { id: taskId, project: { organizationId } },
    select: { id: true },
  });
  if (!task) throw new Error("Task not found.");
  return prisma.projectTaskComment.create({
    data: { taskId, authorId, content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, name: true, image: true } },
    },
  });
}

export async function startTaskTimeEntry(
  taskId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.findFirst({
      where: { id: taskId, project: { organizationId } },
      select: { id: true },
    });
    if (!task) throw new Error("Task not found.");
    const running = await tx.projectTaskTimeEntry.findFirst({
      where: {
        userId,
        endedAt: null,
        task: { project: { organizationId } },
      },
      select: { id: true, taskId: true },
    });
    if (running) {
      if (running.taskId !== taskId) {
        throw new Error("Stop your running timer before starting another task.");
      }
      return running;
    }
    return tx.projectTaskTimeEntry.create({
      data: { taskId, userId },
      select: { id: true, taskId: true },
    });
  });
}

export async function stopTaskTimeEntry(
  taskId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const running = await tx.projectTaskTimeEntry.findFirst({
      where: {
        taskId,
        userId,
        endedAt: null,
        task: { project: { organizationId } },
      },
      select: { id: true, startedAt: true },
    });
    if (!running) return false;
    const endedAt = new Date();
    const durationSeconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - running.startedAt.getTime()) / 1000),
    );
    const result = await tx.projectTaskTimeEntry.updateMany({
      where: {
        id: running.id,
        endedAt: null,
        task: { project: { organizationId } },
      },
      data: { endedAt, durationSeconds },
    });
    if (result.count === 0) return false;
    await tx.projectTask.updateMany({
      where: {
        id: taskId,
        project: { organizationId },
      },
      data: { timeTrackedSeconds: { increment: durationSeconds } },
    });
    return true;
  });
}

export async function getTaskStatusTemplates(organizationId: string) {
  const templates = await prisma.projectTaskStatusTemplate.findMany({
    where: {
      OR: [
        { organizationId },
        { organizationId: null, isSystem: true },
      ],
    },
    select: { id: true, name: true, statuses: true, isSystem: true },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });
  return templates.map(({ statuses, ...template }) => ({
    ...template,
    statuses: parseTaskWorkflowStatuses(statuses),
  }));
}

export async function createTaskStatusTemplateRecord(input: {
  organizationId: string;
  name: string;
  statuses: Prisma.InputJsonValue;
  createdById: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.projectTaskStatusTemplate.findFirst({
      where: {
        organizationId: input.organizationId,
        name: { equals: input.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existing) return false;
    await tx.projectTaskStatusTemplate.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        statuses: input.statuses,
        createdById: input.createdById,
      },
      select: { id: true },
    });
    return true;
  });
}

export async function updateProjectTaskWorkflowRecord(input: {
  organizationId: string;
  projectId: string;
  templateId: string | null;
  statuses: TaskWorkflowStatus[];
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: {
        id: input.projectId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      select: { taskStatuses: true },
    });
    if (!project) return { kind: "not-found" as const };

    if (input.templateId) {
      const template = await tx.projectTaskStatusTemplate.findFirst({
        where: {
          id: input.templateId,
          OR: [
            { organizationId: input.organizationId },
            { organizationId: null, isSystem: true },
          ],
        },
        select: { id: true },
      });
      if (!template) return { kind: "template-not-found" as const };
    }

    const currentStatuses = parseTaskWorkflowStatuses(project.taskStatuses);
    const nextStatusIds = new Set(input.statuses.map(({ id }) => id));
    const removedStatuses = currentStatuses.filter(({ id }) => !nextStatusIds.has(id));
    if (removedStatuses.length > 0) {
      const usedStatuses = await tx.projectTask.groupBy({
        by: ["status"],
        where: {
          projectId: input.projectId,
          project: { organizationId: input.organizationId },
          status: { in: removedStatuses.map(({ id }) => id) },
        },
        _count: { _all: true },
      });
      if (usedStatuses.length > 0) {
        return {
          kind: "statuses-in-use" as const,
          statusNames: usedStatuses.map(({ status }) =>
            currentStatuses.find(({ id }) => id === status)?.name ?? status,
          ),
        };
      }
    }

    const projectUpdate = await tx.project.updateMany({
      where: {
        id: input.projectId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      data: {
        taskStatuses: input.statuses,
        workflowTemplateId: input.templateId,
      },
    });
    if (projectUpdate.count !== 1) return { kind: "not-found" as const };

    const currentGroups = new Map(currentStatuses.map(({ id, group }) => [id, group]));
    for (const status of input.statuses) {
      if (currentGroups.get(status.id) === status.group) continue;
      await tx.projectTask.updateMany({
        where: {
          projectId: input.projectId,
          project: { organizationId: input.organizationId },
          status: status.id,
        },
        data: {
          statusGroup: status.group,
          ...(status.group === "DONE" ? { completedAt: new Date() } : { completedAt: null }),
        },
      });
    }

    await tx.projectActivity.create({
      data: {
        projectId: input.projectId,
        actorId: input.actorId,
        type: "TASK_UPDATED",
        message: "Task workflow updated",
        metadata: { statuses: input.statuses },
      },
    });
    return { kind: "updated" as const };
  });
}

export async function getProjectAssignment(
  projectId: string,
  userId: string,
  organizationId: string,
) {
  const activeUser = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationMemberships: { some: { organizationId } },
      banned: { not: true },
      employmentStatus: EmploymentStatus.ACTIVE,
    },
    select: { id: true },
  });
  if (!activeUser) return null;

  return prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
      deletedAt: null,
      OR: [
        { projectManagerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
}

export async function getTaskProjectAssignment(
  taskId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.projectTask.findFirst({
    where: {
      id: taskId,
      assigneeId: userId,
      project: { organizationId, deletedAt: null },
    },
    select: { id: true, projectId: true },
  });
}

export async function getTaskOwnerAssignment(
  taskId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.projectTask.findFirst({
    where: {
      id: taskId,
      project: { organizationId, deletedAt: null },
      OR: [{ createdById: userId }, { assigneeId: userId }],
    },
    select: { id: true, projectId: true },
  });
}

export async function archiveTaskRecord(
  taskId: string,
  actorId: string,
  organizationId: string,
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.projectTask.findFirst({
      where: { id: taskId, project: { organizationId } },
      select: { projectId: true, title: true },
    });
    if (!task) return null;
    const deleted = await tx.projectTask.deleteMany({
      where: {
        id: taskId,
        projectId: task.projectId,
        project: { organizationId },
      },
    });
    if (deleted.count !== 1) throw new Error("Task not found.");
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
