import { Prisma } from "@/app/generated/prisma/client";
import type { ProjectStatus, ProjectTaskStatus } from "@/app/generated/prisma/enums";
import { canTransitionProject } from "@/lib/project-policy";
import {
  archiveProjectRecord,
  archiveTaskRecord,
  createConvertedProjectRecord,
  createProjectRecord,
  createProjectTaskRecord,
  findTaskForProject,
  formatProjectCode,
  getCustomerForProject,
  getProjectAssignment,
  getProjectByProposalId,
  getProjectStatus,
  getProposalForConversion,
  getTaskProjectAssignment,
  getUsersByIds,
  updateProjectRecord,
  updateProjectStatusRecord,
  updateProjectTaskRecord,
} from "@/repositories/project-repository";
import type {
  ProjectInput,
  ProjectTaskInput,
  ProjectTaskUpdateInput,
  ProjectUpdateInput,
} from "@/lib/schemas/project-schema";

export class ProjectServiceError extends Error {}

function dateOrNull(value?: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

async function validatePeople(
  managerId: string | null | undefined,
  memberIds: string[],
) {
  const ids = [...new Set([...(managerId ? [managerId] : []), ...memberIds])];
  if (!ids.length) return;
  const users = await getUsersByIds(ids);
  if (users.length !== ids.length) {
    throw new ProjectServiceError("One or more selected team members are unavailable.");
  }
}

async function validateCustomer(customerId?: string | null) {
  if (!customerId) return;
  if (!(await getCustomerForProject(customerId))) {
    throw new ProjectServiceError("The selected customer is unavailable.");
  }
}

function toNewProjectData(input: ProjectInput) {
  return {
    name: input.name,
    customerId: input.customerId || null,
    description: input.description || null,
    objectives: input.objectives || null,
    scope: input.scope || null,
    internalNotes: input.internalNotes || null,
    projectManagerId: input.projectManagerId || null,
    teamMemberIds: input.teamMemberIds,
    startDate: dateOrNull(input.startDate),
    dueDate: dateOrNull(input.dueDate),
    priority: input.priority,
    status: input.status,
    budgetAmount: input.budgetAmount,
    currency: input.currency,
  };
}

export async function createProject(input: ProjectInput, actorId: string) {
  await validateCustomer(input.customerId);
  await validatePeople(input.projectManagerId, input.teamMemberIds);
  const project = await createProjectRecord(toNewProjectData(input), actorId);
  return { ...project, projectCode: formatProjectCode(project.projectNumber) };
}

function proposalSnapshot(proposal: NonNullable<Awaited<ReturnType<typeof getProposalForConversion>>>) {
  return {
    proposalId: proposal.id,
    proposalNumber: proposal.proposalNumber,
    title: proposal.title,
    acceptedAt: proposal.acceptedAt?.toISOString() ?? null,
    currency: proposal.currency,
    exchangeRate: proposal.exchangeRate?.toString() ?? null,
    totals: {
      subtotal: proposal.subtotal.toString(),
      discount: proposal.discount.toString(),
      tax: proposal.tax.toString(),
      roundOff: proposal.roundOff.toString(),
      grandTotal: proposal.grandTotal.toString(),
    },
    notes: proposal.notes,
    blocks: proposal.proposalBlocks,
    services: proposal.proposalServices.map((service) => ({
      serviceName: service.serviceName,
      packageName: service.packageName,
      description: service.description,
      notes: service.notes,
      items: service.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        total: item.total.toString(),
      })),
      features: service.features,
    })),
  } satisfies Prisma.InputJsonObject;
}

function proposalScope(proposal: NonNullable<Awaited<ReturnType<typeof getProposalForConversion>>>) {
  const sections = proposal.proposalServices.map((service) => {
    const lines = [
      service.serviceName,
      service.packageName ? `Package: ${service.packageName}` : null,
      service.description,
      ...service.items.map((item) => `- ${item.name}${item.description ? `: ${item.description}` : ""}`),
      ...service.features.map((feature) => `${feature.isHeading ? "" : "- "}${feature.content}`),
    ].filter(Boolean);
    return lines.join("\n");
  }).filter(Boolean);

  return sections.join("\n\n") || proposal.notes || "";
}

export async function convertAcceptedProposalToProject(
  proposalId: string,
  input: ProjectInput,
  actorId: string,
) {
  const existing = await getProjectByProposalId(proposalId);
  if (existing) {
    return {
      ...existing,
      projectCode: formatProjectCode(existing.projectNumber),
      created: false,
    };
  }

  const proposal = await getProposalForConversion(proposalId);
  if (!proposal) {
    throw new ProjectServiceError("Only accepted proposals can be converted to projects.");
  }
  await validatePeople(input.projectManagerId, input.teamMemberIds);

  const projectInput: ProjectInput = {
    ...input,
    customerId: proposal.customerId,
    currency: proposal.currency === "USD" ? "USD" : "INR",
    description: input.description || proposal.notes || "",
    scope: input.scope || proposalScope(proposal),
  };

  try {
    const result = await createConvertedProjectRecord(
      proposalId,
      toNewProjectData(projectInput),
      actorId,
      proposalSnapshot(proposal),
    );
    if (!result.project) {
      throw new ProjectServiceError("The proposal is no longer accepted and cannot be converted.");
    }
    return {
      ...result.project,
      projectCode: formatProjectCode(result.project.projectNumber),
      created: result.created,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const converted = await getProjectByProposalId(proposalId);
      if (converted) {
        return {
          ...converted,
          projectCode: formatProjectCode(converted.projectNumber),
          created: false,
        };
      }
    }
    throw error;
  }
}

export async function updateProject(input: ProjectUpdateInput, actorId: string) {
  if (input.customerId !== undefined) await validateCustomer(input.customerId);
  if (input.teamMemberIds !== undefined) {
    await validatePeople(input.projectManagerId, input.teamMemberIds);
  } else if (input.projectManagerId) {
    await validatePeople(input.projectManagerId, []);
  }

  const { projectId, startDate, dueDate, ...rest } = input;
  const project = await updateProjectRecord(
    projectId,
    {
      ...rest,
      ...(startDate !== undefined ? { startDate: dateOrNull(startDate) } : {}),
      ...(dueDate !== undefined ? { dueDate: dateOrNull(dueDate) } : {}),
    },
    actorId,
  );
  return { ...project, projectCode: formatProjectCode(project.projectNumber) };
}

export async function updateProjectStatus(
  projectId: string,
  status: ProjectStatus,
  actorId: string,
) {
  const current = await getProjectStatus(projectId);
  if (!current) throw new ProjectServiceError("Project not found.");
  if (!canTransitionProject(current.status, status)) {
    throw new ProjectServiceError(
      `A project cannot move from ${current.status.replaceAll("_", " ")} to ${status.replaceAll("_", " ")}.`,
    );
  }
  if (current.status === status) return { id: projectId, status };
  const updated = await updateProjectStatusRecord(projectId, status, actorId);
  if (!updated) throw new ProjectServiceError("Project not found.");
  return updated;
}

export async function archiveProject(projectId: string, actorId: string) {
  await archiveProjectRecord(projectId, actorId);
}

export async function createProjectTask(input: ProjectTaskInput, actorId: string) {
  if (!(await getProjectStatus(input.projectId))) {
    throw new ProjectServiceError("Project not found.");
  }
  if (input.assigneeId && !(await getProjectAssignment(input.projectId, input.assigneeId))) {
    throw new ProjectServiceError("Tasks can only be assigned to this project’s manager or team members.");
  }
  const task = await createProjectTaskRecord(
    {
      ...input,
      description: input.description || null,
      assigneeId: input.assigneeId || null,
      dueDate: dateOrNull(input.dueDate),
    },
    actorId,
  );
  return task;
}

export async function updateProjectTask(
  input: ProjectTaskUpdateInput,
  actorId: string,
  isAdmin: boolean,
) {
  const current = await findTaskForProject(input.taskId);
  if (!current) throw new ProjectServiceError("Task not found.");
  if (!isAdmin && current.assigneeId !== actorId) {
    throw new ProjectServiceError("You can only update tasks assigned to you.");
  }
  if (!isAdmin && Object.keys(input).some((key) => key !== "taskId" && key !== "status")) {
    throw new ProjectServiceError("Assigned staff can only update task status.");
  }
  if (input.assigneeId && !(await getProjectAssignment(current.projectId, input.assigneeId))) {
    throw new ProjectServiceError("Tasks can only be assigned to this project’s manager or team members.");
  }
  const { taskId, dueDate, ...rest } = input;
  const task = await updateProjectTaskRecord(
    taskId,
    {
      ...rest,
      ...(dueDate !== undefined ? { dueDate: dateOrNull(dueDate) } : {}),
    },
    actorId,
  );
  return task;
}

export async function deleteProjectTask(taskId: string, actorId: string) {
  return archiveTaskRecord(taskId, actorId);
}

export async function canViewProject(projectId: string, userId: string) {
  return Boolean(await getProjectAssignment(projectId, userId));
}

export async function canUpdateAssignedTask(taskId: string, userId: string) {
  return Boolean(await getTaskProjectAssignment(taskId, userId));
}

export type ProjectTaskStatusValue = ProjectTaskStatus;
