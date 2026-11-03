import { Prisma } from "@/app/generated/prisma/client";
import type { ProjectStatus } from "@/app/generated/prisma/enums";
import { canTransitionProject } from "@/lib/project-policy";
import { DEFAULT_TASK_STATUS_TEMPLATE_ID, DEFAULT_TASK_WORKFLOW, type TaskWorkflowStatus } from "@/lib/task-status";
import {
  archiveProjectRecord,
  archiveTaskRecord,
  createTaskAttachment,
  createTaskChecklistItem,
  createTaskComment,
  createTaskDependency,
  createConvertedProjectRecord,
  createProjectRecord,
  createProjectTaskRecord,
  createTaskStatusTemplateRecord,
  createProjectTaskFolderRecord,
  deleteTaskAttachment,
  deleteTaskChecklistItem,
  deleteTaskDependency,
  findTaskForProject,
  formatProjectCode,
  getCustomerForProject,
  getProjectAssignment,
  getProjectByProposalId,
  getProjectStatus,
  getProjectTaskWorkflow,
  getProjectTaskFolders,
  getProposalForConversion,
  getTaskDependencyGraph,
  getTaskProjectAssignment,
  getUsersByIds,
  startTaskTimeEntry,
  stopTaskTimeEntry,
  updateTaskChecklistItem,
  updateProjectRecord,
  updateProjectStatusRecord,
  updateProjectTaskRecord,
  updateProjectTaskWorkflowRecord,
  updateProjectTaskFolderRecord,
  deleteProjectTaskFolderRecord,
} from "@/repositories/project-repository";
import type {
  ProjectInput,
  ProjectTaskInput,
  ProjectTaskUpdateInput,
  ProjectTeamUpdateInput,
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
    taskStatuses: DEFAULT_TASK_WORKFLOW,
    workflowTemplateId: DEFAULT_TASK_STATUS_TEMPLATE_ID,
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

export async function updateProjectTeam(
  input: ProjectTeamUpdateInput,
  actorId: string,
) {
  await validatePeople(input.projectManagerId, input.teamMemberIds);
  const project = await updateProjectRecord(
    input.projectId,
    {
      projectManagerId: input.projectManagerId,
      teamMemberIds: input.teamMemberIds,
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
  const workflow = await getProjectTaskWorkflow(input.projectId);
  if (!workflow) throw new ProjectServiceError("Project not found.");
  const taskFolders = await getProjectTaskFolders(input.projectId);
  let parentTask: Awaited<ReturnType<typeof findTaskForProject>> = null;
  if (input.parentTaskId) {
    parentTask = await findTaskForProject(input.parentTaskId);
    if (
      !parentTask ||
      parentTask.projectId !== input.projectId ||
      parentTask.parentTaskId
    ) {
      throw new ProjectServiceError("Subtasks must belong to a top-level task in the same project.");
    }
  }
  const folder = input.folderId
    ? taskFolders.find(({ id }) => id === input.folderId)
    : parentTask
      ? taskFolders.find(({ id }) => id === parentTask.folderId)
      : taskFolders.find(({ name, parentId }) => name === "General" && parentId === null)
        ?? taskFolders.find(({ parentId }) => parentId === null);
  if (!folder) throw new ProjectServiceError("Choose a folder from this project.");
  if (input.assigneeId && !(await getProjectAssignment(input.projectId, input.assigneeId))) {
    throw new ProjectServiceError("Tasks can only be assigned to this project’s manager or team members.");
  }
  const initialStatus = workflow.taskStatuses.find(({ group }) => group === "NOT_STARTED");
  if (!initialStatus) throw new ProjectServiceError("The project has no task status in the Not started group.");
  const status = input.status
    ? workflow.taskStatuses.find(({ id }) => id === input.status)
    : initialStatus;
  if (!status) throw new ProjectServiceError("Choose a status from this project’s workflow.");
  const task = await createProjectTaskRecord(
    {
      ...input,
      folderId: folder.id,
      status: status.id,
      statusGroup: status.group,
      description: input.description || null,
      assigneeId: input.assigneeId || null,
      startDate: dateOrNull(input.startDate),
      dueDate: dateOrNull(input.dueDate),
      timeEstimateMinutes: input.timeEstimateMinutes ?? null,
      sprintPoints: input.sprintPoints ?? null,
      parentTaskId: input.parentTaskId || null,
    },
    actorId,
  );
  return task;
}

export async function saveProjectTaskFolder(input: {
  projectId: string;
  folderId?: string;
  name: string;
  parentId: string | null;
}) {
  const folders = await getProjectTaskFolders(input.projectId);
  const current = input.folderId
    ? folders.find(({ id }) => id === input.folderId)
    : null;
  if (input.folderId && !current) {
    throw new ProjectServiceError("Folder not found in this project.");
  }
  const parent = input.parentId
    ? folders.find(({ id }) => id === input.parentId)
    : null;
  if (input.parentId && !parent) {
    throw new ProjectServiceError("Choose a parent folder from this project.");
  }
  if (current && input.parentId) {
    const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
    let ancestorId: string | null = input.parentId;
    while (ancestorId) {
      if (ancestorId === current.id) {
        throw new ProjectServiceError("A folder cannot be moved inside itself.");
      }
      ancestorId = foldersById.get(ancestorId)?.parentId ?? null;
    }
  }
  const normalizedName = input.name.trim().toLocaleLowerCase();
  if (folders.some((folder) =>
    folder.id !== current?.id &&
    folder.parentId === input.parentId &&
    folder.name.trim().toLocaleLowerCase() === normalizedName,
  )) {
    throw new ProjectServiceError("A folder with this name already exists here.");
  }
  if (current) {
    return updateProjectTaskFolderRecord({
      folderId: current.id,
      name: input.name.trim(),
      parentId: input.parentId,
    });
  }
  return createProjectTaskFolderRecord({
    projectId: input.projectId,
    name: input.name.trim(),
    parentId: input.parentId,
  });
}

export async function removeProjectTaskFolder(projectId: string, folderId: string) {
  const folder = (await getProjectTaskFolders(projectId)).find(({ id }) => id === folderId);
  if (!folder) throw new ProjectServiceError("Folder not found in this project.");
  await deleteProjectTaskFolderRecord(projectId, folderId);
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
  const nextStartDate = input.startDate === undefined
    ? current.startDate?.toISOString().slice(0, 10) ?? null
    : input.startDate;
  const nextDueDate = input.dueDate === undefined
    ? current.dueDate?.toISOString().slice(0, 10) ?? null
    : input.dueDate;
  if (nextStartDate && nextDueDate && nextDueDate < nextStartDate) {
    throw new ProjectServiceError("Due date must be on or after the start date.");
  }
  if (
    input.assigneeId &&
    input.assigneeId !== current.assigneeId &&
    !(await getProjectAssignment(current.projectId, input.assigneeId))
  ) {
    throw new ProjectServiceError("Tasks can only be assigned to this project’s manager or team members.");
  }
  if (input.folderId) {
    const folders = await getProjectTaskFolders(current.projectId);
    if (!folders.some(({ id }) => id === input.folderId)) {
      throw new ProjectServiceError("Choose a folder from this project.");
    }
  }
  const workflow = input.status === undefined
    ? null
    : await getProjectTaskWorkflow(current.projectId);
  const nextStatus = input.status === undefined
    ? undefined
    : workflow?.taskStatuses.find(({ id }) => id === input.status);
  if (input.status !== undefined && !nextStatus) {
    throw new ProjectServiceError("Choose a status from this project’s workflow.");
  }
  const { taskId, dueDate, startDate, ...rest } = input;
  delete rest.status;
  const task = await updateProjectTaskRecord(
    taskId,
    {
      ...rest,
      ...(nextStatus
        ? {
            status: nextStatus.id,
            statusGroup: nextStatus.group,
            statusLabel: nextStatus.name,
          }
        : {}),
      ...(dueDate !== undefined ? { dueDate: dateOrNull(dueDate) } : {}),
      ...(startDate !== undefined ? { startDate: dateOrNull(startDate) } : {}),
    },
    actorId,
  );
  return task;
}

async function requireTask(taskId: string) {
  const task = await findTaskForProject(taskId);
  if (!task) throw new ProjectServiceError("Task not found.");
  return task;
}

export async function createProjectTaskChecklistItem(taskId: string, title: string) {
  await requireTask(taskId);
  return createTaskChecklistItem(taskId, title);
}

export async function updateProjectTaskChecklistItem(
  taskId: string,
  itemId: string,
  isComplete: boolean,
) {
  await requireTask(taskId);
  if (!(await updateTaskChecklistItem(taskId, itemId, isComplete))) {
    throw new ProjectServiceError("Checklist item not found.");
  }
}

export async function removeProjectTaskChecklistItem(taskId: string, itemId: string) {
  await requireTask(taskId);
  if (!(await deleteTaskChecklistItem(taskId, itemId))) {
    throw new ProjectServiceError("Checklist item not found.");
  }
}

export async function createProjectTaskDependency(
  taskId: string,
  dependsOnTaskId: string,
  relationType: "BLOCKED_BY" | "RELATED_TO",
) {
  const [task, dependsOnTask] = await Promise.all([
    requireTask(taskId),
    requireTask(dependsOnTaskId),
  ]);
  if (task.id === dependsOnTask.id) {
    throw new ProjectServiceError("A task cannot depend on itself.");
  }
  if (task.projectId !== dependsOnTask.projectId) {
    throw new ProjectServiceError("Dependencies must be in the same project.");
  }
  if (relationType === "BLOCKED_BY") {
    const graph = await getTaskDependencyGraph(task.projectId);
    const dependencies = new Map(
      graph.map((item) => [
        item.id,
        item.dependencies
          .filter(({ relationType: type }) => type === "BLOCKED_BY")
          .map(({ dependsOnTaskId: id }) => id),
      ]),
    );
    const visited = new Set<string>();
    const pending = [dependsOnTaskId];
    while (pending.length) {
      const currentId = pending.pop();
      if (!currentId || visited.has(currentId)) continue;
      if (currentId === taskId) {
        throw new ProjectServiceError("This dependency would create a cycle.");
      }
      visited.add(currentId);
      pending.push(...(dependencies.get(currentId) ?? []));
    }
  }
  try {
    await createTaskDependency(taskId, dependsOnTaskId, relationType);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ProjectServiceError("This dependency already exists.");
    }
    throw error;
  }
}

export async function removeProjectTaskDependency(taskId: string, dependencyId: string) {
  await requireTask(taskId);
  if (!(await deleteTaskDependency(taskId, dependencyId))) {
    throw new ProjectServiceError("Dependency not found.");
  }
}

export async function createProjectTaskAttachment(
  input: {
    taskId: string;
    url: string;
    publicId: string;
    resourceType: "image" | "raw";
    fileName: string;
    fileSize: number;
  },
  actorId: string,
) {
  await requireTask(input.taskId);
  let uploadedUrl: URL;
  try {
    uploadedUrl = new URL(input.url);
  } catch {
    throw new ProjectServiceError("The uploaded file URL is invalid.");
  }
  if (
    uploadedUrl.protocol !== "https:" ||
    uploadedUrl.hostname !== "res.cloudinary.com" ||
    !input.publicId.startsWith(`tasks/${input.taskId}/`) ||
    input.publicId.includes("\\") ||
    input.publicId.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new ProjectServiceError("The uploaded file does not belong to this task.");
  }
  try {
    return await createTaskAttachment(input, actorId);
  } catch (error) {
    if (error instanceof Error && error.message === "A task can have up to 20 attachments.") {
      throw new ProjectServiceError(error.message);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ProjectServiceError("This file is already attached to a task.");
    }
    throw error;
  }
}

export async function removeProjectTaskAttachment(taskId: string, attachmentId: string) {
  await requireTask(taskId);
  if (!(await deleteTaskAttachment(taskId, attachmentId))) {
    throw new ProjectServiceError("Attachment not found.");
  }
}

export async function createProjectTaskComment(
  taskId: string,
  authorId: string,
  content: string,
) {
  await requireTask(taskId);
  return createTaskComment(taskId, authorId, content);
}

export async function startProjectTaskTimer(taskId: string, userId: string) {
  await requireTask(taskId);
  try {
    await startTaskTimeEntry(taskId, userId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Stop your running timer before starting another task."
    ) {
      throw new ProjectServiceError(error.message);
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ProjectServiceError("Stop your running timer before starting another task.");
    }
    throw error;
  }
}

export async function stopProjectTaskTimer(taskId: string, userId: string) {
  await requireTask(taskId);
  if (!(await stopTaskTimeEntry(taskId, userId))) {
    throw new ProjectServiceError("No running timer was found for this task.");
  }
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

export async function updateProjectTaskWorkflow(input: {
  projectId: string;
  templateId: string | null;
  statuses: TaskWorkflowStatus[];
  actorId: string;
}) {
  const result = await updateProjectTaskWorkflowRecord(input);
  if (result.kind === "not-found") throw new ProjectServiceError("Project not found.");
  if (result.kind === "template-not-found") {
    throw new ProjectServiceError("The selected status template is unavailable.");
  }
  if (result.kind === "statuses-in-use") {
    throw new ProjectServiceError(
      `Move tasks out of ${result.statusNames.join(", ")} before removing those statuses.`,
    );
  }
}

export async function saveTaskStatusTemplate(input: {
  name: string;
  statuses: TaskWorkflowStatus[];
  actorId: string;
}) {
  const saved = await createTaskStatusTemplateRecord({
    name: input.name,
    statuses: input.statuses,
    createdById: input.actorId,
  });
  if (!saved) throw new ProjectServiceError("A status template with that name already exists.");
}
