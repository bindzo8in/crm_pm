"use server";

import { UserRole } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { hasWorkspaceAccess } from "@/lib/workspace-access";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  projectInputSchema,
  projectCreationContextSchema,
  projectQuerySchema,
  projectUserQuerySchema,
  projectStatusUpdateSchema,
  projectTaskInputSchema,
  projectTaskUpdateSchema,
  projectUpdateSchema,
} from "@/lib/schemas/project-schema";
import { errorResponse, successResponse } from "@/lib/action-response";
import {
  archiveProject,
  canUpdateAssignedTask,
  canViewProject,
  convertAcceptedProposalToProject,
  createProject,
  createProjectTask,
  deleteProjectTask,
  ProjectServiceError,
  updateProject,
  updateProjectStatus,
  updateProjectTask,
} from "@/services/project-service";
import { canTransitionProject } from "@/lib/project-policy";
import {
  formatProjectCode,
  getCustomerForProject,
  getProjectById,
  getProjectByProposalId,
  getProjectFormOptions,
  getProjectPage,
  getProjectUserPage,
  getRelatedInvoicesForProject,
  getProposalForConversion,
} from "@/repositories/project-repository";

type ProjectPermission =
  | "create"
  | "read-all"
  | "read-assigned"
  | "update"
  | "update-status"
  | "manage-team"
  | "view-budget"
  | "archive";

type TaskPermission =
  | "create"
  | "read-all"
  | "read-assigned"
  | "update"
  | "delete"
  | "assign"
  | "update-own";

type InvoicePermission = "read";

type ProjectActor = {
  id: string;
  role: UserRole;
  canReadAll: boolean;
  canViewBudget: boolean;
  canManageProjects: boolean;
};

async function hasPermission(
  resource: "projects" | "tasks" | "invoices",
  permission: ProjectPermission | TaskPermission | InvoicePermission,
) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user || !hasWorkspaceAccess(session.user)) return null;

  const result = await auth.api.userHasPermission({
    headers: requestHeaders,
    body: { permissions: { [resource]: [permission] } },
  });
  return result.success ? session.user : null;
}

async function getProjectReadActor(): Promise<ProjectActor | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user || !hasWorkspaceAccess(session.user)) return null;
  const readAll = await auth.api.userHasPermission({
    headers: requestHeaders,
    body: { permissions: { projects: ["read-all"] } },
  });
  const readAssigned = await auth.api.userHasPermission({
    headers: requestHeaders,
    body: { permissions: { projects: ["read-assigned"] } },
  });
  if (!readAll.success && !readAssigned.success) return null;
  const viewBudget = await auth.api.userHasPermission({
    headers: requestHeaders,
    body: { permissions: { projects: ["view-budget"] } },
  });
  const manageProjects = await auth.api.userHasPermission({
    headers: requestHeaders,
    body: { permissions: { projects: ["update"] } },
  });
  return {
    id: session.user.id,
    role: session.user.role as UserRole,
    canReadAll: readAll.success,
    canViewBudget: viewBudget.success,
    canManageProjects: manageProjects.success,
  };
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof ProjectServiceError) {
    return errorResponse(error.message);
  }
  console.error(fallback, error);
  return errorResponse(fallback);
}

export async function getProjects(input: unknown) {
  const actor = await getProjectReadActor();
  if (!actor) return errorResponse("You do not have permission to view projects.");
  const parsed = projectQuerySchema.safeParse(input);
  if (!parsed.success) return errorResponse("Project filters are invalid.", parsed.error.issues);

  try {
    const page = await getProjectPage(parsed.data, actor);
    const canCreateProjects = await hasPermission("projects", "create");
    return successResponse("Projects loaded.", {
      ...page,
      canCreateProjects: Boolean(canCreateProjects),
    });
  } catch (error) {
    return actionError(error, "Unable to load projects.");
  }
}

export async function getProject(projectId: string) {
  const actor = await getProjectReadActor();
  if (!actor) return errorResponse("You do not have permission to view projects.");
  if (typeof projectId !== "string" || projectId.trim().length === 0 || projectId.length > 100) {
    return errorResponse("Project ID is required.");
  }

  try {
    const project = await getProjectById(projectId, actor);
    if (!project) return errorResponse("Project not found or you do not have access.");
    const [
      canEdit,
      canChangeStatus,
      canArchive,
      canCreateTasks,
      canUpdateTasks,
      canUpdateOwnTasks,
      canDeleteTasks,
      canManageTeam,
      canReadInvoices,
    ] = await Promise.all([
      hasPermission("projects", "update"),
      hasPermission("projects", "update-status"),
      hasPermission("projects", "archive"),
      hasPermission("tasks", "create"),
      hasPermission("tasks", "update"),
      hasPermission("tasks", "update-own"),
      hasPermission("tasks", "delete"),
      hasPermission("projects", "manage-team"),
      hasPermission("invoices", "read"),
    ]);
    const relatedInvoices = canReadInvoices
      ? await getRelatedInvoicesForProject(project.customerId, project.proposalId)
      : [];
    const statusOptions = (["PLANNING", "NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"] as const)
      .filter((status) => canTransitionProject(project.status, status));
    return successResponse("Project loaded.", {
      project,
      actorId: actor.id,
      permissions: {
        canEdit: Boolean(canEdit),
        canChangeStatus: Boolean(canChangeStatus),
        canArchive: Boolean(canArchive),
        canCreateTasks: Boolean(canCreateTasks),
        canUpdateTasks: Boolean(canUpdateTasks),
        canUpdateOwnTasks: Boolean(canUpdateOwnTasks),
        canDeleteTasks: Boolean(canDeleteTasks),
        canManageTeam: Boolean(canManageTeam),
        canManageProjects: actor.canManageProjects,
        canReadAllTasks: actor.canReadAll,
        canViewBudget: actor.canViewBudget,
      },
      statusOptions,
      relatedInvoices,
    });
  } catch (error) {
    return actionError(error, "Unable to load project.");
  }
}

export async function getProjectCreationContext(input: unknown) {
  const user = await hasPermission("projects", "create");
  if (!user) return errorResponse("You do not have permission to create projects.");
  const parsed = projectCreationContextSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Project form options are invalid.", parsed.error.issues);

  try {
    const canManageTeam = await hasPermission("projects", "manage-team");
    const [options, customer, proposal, existingProject] = await Promise.all([
      getProjectFormOptions(canManageTeam ? [user.id] : []),
      parsed.data.customerId ? getCustomerForProject(parsed.data.customerId) : Promise.resolve(null),
      parsed.data.proposalId ? getProposalForConversion(parsed.data.proposalId) : Promise.resolve(null),
      parsed.data.proposalId ? getProjectByProposalId(parsed.data.proposalId) : Promise.resolve(null),
    ]);
    if (parsed.data.customerId && !customer) return errorResponse("Customer not found.");
    if (parsed.data.proposalId && !proposal && !existingProject) {
      return errorResponse("Only an accepted proposal can be converted to a project.");
    }
    const proposalCustomer = proposal && !existingProject
      ? await getCustomerForProject(proposal.customerId)
      : null;
    if (proposal && !existingProject && !proposalCustomer) {
      return errorResponse("The customer linked to this proposal is unavailable.");
    }
    const selectedCustomer = proposalCustomer ?? customer;
    const customers = selectedCustomer
      ? [selectedCustomer, ...options.customers.filter(({ id }) => id !== selectedCustomer.id)]
      : options.customers;

    const proposalPreview = proposal ? {
      id: proposal.id,
      proposalCode: `QUOT-${proposal.proposalNumber}`,
      title: proposal.title,
      customerId: proposal.customerId,
      customerName: proposal.customerDisplayName,
      customerCompanyName: proposal.customerCompanyName,
      currency: proposal.currency,
      total: proposal.grandTotal.toNumber(),
    } : null;

    const creationActor = await getProjectReadActor();
    const existingCanView = existingProject && creationActor
      ? await canViewProject(existingProject.id, creationActor.id) ||
        creationActor.canReadAll
      : false;
    if (existingProject && !existingCanView) {
      return errorResponse("This proposal has already been converted to a project you cannot access.");
    }

    return successResponse("Project form data loaded.", {
      ...options,
      customers,
      customer: selectedCustomer,
      proposal: proposalPreview,
      existingProject: existingProject && existingCanView
        ? {
          id: existingProject.id,
          projectCode: formatProjectCode(existingProject.projectNumber),
        }
        : null,
      currentUserId: user.id,
      canManageProjects: Boolean(await hasPermission("projects", "update")),
      canManageTeam: Boolean(canManageTeam),
      canManageBudget: Boolean(await hasPermission("projects", "view-budget")),
    });
  } catch (error) {
    return actionError(error, "Unable to load project form data.");
  }
}

export async function getProjectEditContext(projectId: string) {
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to edit projects.");
  if (typeof projectId !== "string" || projectId.trim().length === 0 || projectId.length > 100) {
    return errorResponse("Project ID is invalid.");
  }
  const actor = await getProjectReadActor();
  if (!actor) return errorResponse("You do not have permission to view projects.");

  try {
    const project = await getProjectById(projectId, actor);
    if (!project) return errorResponse("Project not found or you do not have access.");
    const [options, canManageTeam, canManageBudget] = await Promise.all([
      getProjectFormOptions([
        ...(project.projectManagerId ? [project.projectManagerId] : []),
        ...project.members.map(({ user }) => user.id),
      ]),
      hasPermission("projects", "manage-team"),
      hasPermission("projects", "view-budget"),
    ]);
    const customers = project.customer
      ? [project.customer, ...options.customers.filter(({ id }) => id !== project.customer?.id)]
      : options.customers;
    return successResponse("Project edit data loaded.", {
      project,
      customers,
      users: options.users,
      currentUserId: user.id,
      canManageProjects: true,
      canManageTeam: Boolean(canManageTeam),
      canManageBudget: Boolean(canManageBudget),
    });
  } catch (error) {
    return actionError(error, "Unable to load project edit data.");
  }
}

export async function searchProjectUsers(input: unknown) {
  const user = await hasPermission("projects", "manage-team");
  if (!user) return errorResponse("You do not have permission to assign project team members.");
  const parsed = projectUserQuerySchema.safeParse(input);
  if (!parsed.success) return errorResponse("User search is invalid.", parsed.error.issues);

  try {
    const result = await getProjectUserPage(parsed.data.search, parsed.data.page);
    return successResponse("Project users loaded.", result);
  } catch (error) {
    return actionError(error, "Unable to search project users.");
  }
}

export async function createProjectAction(input: unknown) {
  const user = await hasPermission("projects", "create");
  if (!user) return errorResponse("You do not have permission to create projects.");
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Project details are invalid.", parsed.error.issues);
  if (parsed.data.proposalId) {
    return errorResponse("Use the accepted-proposal conversion workflow for linked projects.");
  }

  try {
    const [canManageTeam, canManageBudget, canManageProjects] = await Promise.all([
      hasPermission("projects", "manage-team"),
      hasPermission("projects", "view-budget"),
      hasPermission("projects", "update"),
    ]);
    const projectInput = {
      ...parsed.data,
      ...(canManageTeam ? {} : { projectManagerId: user.id, teamMemberIds: [] }),
      ...(canManageBudget ? {} : { budgetAmount: undefined }),
      ...(canManageProjects ? {} : { internalNotes: undefined }),
    };
    const project = await createProject(projectInput, user.id);
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/customers");
    return successResponse("Project created.", project);
  } catch (error) {
    return actionError(error, "Unable to create project.");
  }
}

export async function convertProposalToProjectAction(
  proposalId: string,
  input: unknown,
) {
  const user = await hasPermission("projects", "create");
  if (!user) return errorResponse("You do not have permission to create projects.");
  if (typeof proposalId !== "string" || proposalId.trim().length === 0) {
    return errorResponse("Proposal ID is required.");
  }
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Project details are invalid.", parsed.error.issues);

  try {
    const [canManageTeam, canManageBudget, canManageProjects] = await Promise.all([
      hasPermission("projects", "manage-team"),
      hasPermission("projects", "view-budget"),
      hasPermission("projects", "update"),
    ]);
    const projectInput = {
      ...parsed.data,
      ...(canManageTeam ? {} : { projectManagerId: user.id, teamMemberIds: [] }),
      ...(canManageBudget ? {} : { budgetAmount: undefined }),
      ...(canManageProjects ? {} : { internalNotes: undefined }),
    };
    const project = await convertAcceptedProposalToProject(proposalId, projectInput, user.id);
    const actor = await getProjectReadActor();
    if (
      !actor ||
      (!actor.canReadAll && !(await canViewProject(project.id, actor.id)))
    ) {
      return errorResponse("The proposal has already been converted to a project you cannot access.");
    }
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${project.id}`);
    revalidatePath("/dashboard/proposals");
    return successResponse(
      project.created ? "Accepted proposal converted to a project." : "This proposal already has a project.",
      project,
    );
  } catch (error) {
    return actionError(error, "Unable to convert proposal to project.");
  }
}

export async function updateProjectAction(input: unknown) {
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to edit project details.");
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Project details are invalid.", parsed.error.issues);
  const [canManageTeam, canManageBudget] = await Promise.all([
    hasPermission("projects", "manage-team"),
    hasPermission("projects", "view-budget"),
  ]);
  if (!canManageTeam && (
    parsed.data.projectManagerId !== undefined ||
    parsed.data.teamMemberIds !== undefined
  )) {
    return errorResponse("You do not have permission to change project assignments.");
  }
  if (!canManageBudget && parsed.data.budgetAmount !== undefined) {
    return errorResponse("You do not have permission to change project budgets.");
  }

  try {
    const actor = await getProjectReadActor();
    const current = actor ? await getProjectById(parsed.data.projectId, actor) : null;
    if (!current) return errorResponse("Project not found or you do not have access.");
    if (
      current.proposal &&
      parsed.data.customerId !== undefined &&
      parsed.data.customerId !== current.customerId
    ) {
      return errorResponse("The customer linked to an accepted proposal cannot be changed.");
    }
    const projectInput = current.customer?.deletedAt &&
      parsed.data.customerId === current.customerId
      ? { ...parsed.data, customerId: undefined }
      : parsed.data;
    const project = await updateProject(projectInput, user.id);
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${project.id}`);
    return successResponse("Project details updated.", project);
  } catch (error) {
    return actionError(error, "Unable to update project.");
  }
}

export async function updateProjectStatusAction(input: unknown) {
  const parsed = projectStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Project status update is invalid.", parsed.error.issues);
  const [statusUser, adminUser] = await Promise.all([
    hasPermission("projects", "update-status"),
    hasPermission("projects", "update"),
  ]);
  const user = statusUser ?? adminUser;
  if (!user) return errorResponse("You do not have permission to change project status.");
  const isAdmin = user.role !== UserRole.STAFF;
  if (!isAdmin && !(await canViewProject(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const result = await updateProjectStatus(parsed.data.projectId, parsed.data.status, user.id);
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    return successResponse("Project status updated.", result);
  } catch (error) {
    return actionError(error, "Unable to update project status.");
  }
}

export async function archiveProjectAction(projectId: string) {
  const user = await hasPermission("projects", "archive");
  if (!user) return errorResponse("You do not have permission to archive projects.");
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return errorResponse("Project ID is required.");
  }

  try {
    await archiveProject(projectId, user.id);
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${projectId}`);
    return successResponse("Project archived.");
  } catch (error) {
    return actionError(error, "Unable to archive project.");
  }
}

export async function createProjectTaskAction(input: unknown) {
  const user = await hasPermission("tasks", "create");
  if (!user) return errorResponse("You do not have permission to create tasks.");
  const parsed = projectTaskInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task details are invalid.", parsed.error.issues);
  if (user.role === UserRole.STAFF && !(await canViewProject(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const task = await createProjectTask(parsed.data, user.id);
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    return successResponse("Task created.", task);
  } catch (error) {
    return actionError(error, "Unable to create task.");
  }
}

export async function updateProjectTaskAction(input: unknown) {
  const parsed = projectTaskUpdateSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task update is invalid.", parsed.error.issues);
  const [updateUser, ownUser] = await Promise.all([
    hasPermission("tasks", "update"),
    hasPermission("tasks", "update-own"),
  ]);
  const user = updateUser ?? ownUser;
  if (!user) return errorResponse("You do not have permission to update tasks.");
  const isAdmin = updateUser !== null;
  if (!isAdmin && !(await canUpdateAssignedTask(parsed.data.taskId, user.id))) {
    return errorResponse("Task not found or you do not have access.");
  }

  try {
    const task = await updateProjectTask(parsed.data, user.id, isAdmin);
    revalidatePath(`/dashboard/projects/${task.projectId}`);
    return successResponse("Task updated.", task);
  } catch (error) {
    return actionError(error, "Unable to update task.");
  }
}

export async function deleteProjectTaskAction(taskId: string) {
  const user = await hasPermission("tasks", "delete");
  if (!user) return errorResponse("You do not have permission to delete tasks.");
  if (typeof taskId !== "string" || taskId.trim().length === 0) {
    return errorResponse("Task ID is required.");
  }

  try {
    const result = await deleteProjectTask(taskId, user.id);
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${result.projectId}`);
    return successResponse("Task removed.");
  } catch (error) {
    return actionError(error, "Unable to remove task.");
  }
}
