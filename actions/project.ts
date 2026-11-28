"use server";

import { auth } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  projectInputSchema,
  projectCreationContextSchema,
  projectQuerySchema,
  projectTaskWorkspaceQuerySchema,
  projectUserQuerySchema,
  projectStatusUpdateSchema,
  projectTeamUpdateSchema,
  projectTaskInputSchema,
  projectTaskFolderCreateSchema,
  projectTaskFolderDeleteSchema,
  projectTaskFolderUpdateSchema,
  projectTaskAttachmentDeleteSchema,
  projectTaskAttachmentInputSchema,
  projectTaskChecklistDeleteSchema,
  projectTaskChecklistInputSchema,
  projectTaskChecklistUpdateSchema,
  projectTaskCommentInputSchema,
  projectTaskDependencyDeleteSchema,
  projectTaskDependencyInputSchema,
  projectTaskIdSchema,
  projectTaskStatusTemplateInputSchema,
  projectTaskTimerSchema,
  projectTaskUpdateSchema,
  projectTaskWorkflowUpdateSchema,
  projectUpdateSchema,
} from "@/lib/schemas/project-schema";
import { errorResponse, successResponse } from "@/lib/action-response";
import {
  archiveProject,
  canUpdateOwnedTask,
  canViewProject,
  convertAcceptedProposalToProject,
  createProject,
  createProjectTask,
  removeProjectTaskFolder,
  saveProjectTaskFolder,
  saveTaskStatusTemplate,
  deleteProjectTask,
  ProjectServiceError,
  updateProject,
  updateProjectTeam,
  updateProjectStatus,
  updateProjectTask,
  updateProjectTaskWorkflow,
  createProjectTaskAttachment,
  createProjectTaskChecklistItem,
  createProjectTaskComment,
  createProjectTaskDependency,
  removeProjectTaskAttachment,
  removeProjectTaskChecklistItem,
  removeProjectTaskDependency,
  startProjectTaskTimer,
  stopProjectTaskTimer,
  updateProjectTaskChecklistItem,
} from "@/services/project-service";
import { canTransitionProject } from "@/lib/project-policy";
import { getProposalPermissionScope } from "@/lib/proposal-permissions";
import {
  checkOrganizationPermission,
  getActiveOrganizationId,
} from "@/lib/organization-authorization";
import {
  formatProjectCode,
  getCustomerForProject,
  getProjectById,
  getProjectByProposalId,
  getProjectFormOptions,
  getProjectPage,
  getProjectTaskWorkspacePage,
  getProjectTaskWorkflow,
  getProjectTaskPreview,
  getProjectAssignment,
  findTaskForProject,
  getProjectTeamById,
  getTaskCreationProjectOptions,
  getTaskStatusTemplates,
  getProjectUserPage,
  getRelatedInvoicesForProject,
  getProposalForConversion,
} from "@/repositories/project-repository";

type ProjectPermission =
  | "create"
  | "read-all"
  | "read-assigned"
  | "read-own"
  | "update"
  | "update-own"
  | "update-status"
  | "manage-team"
  | "view-budget"
  | "archive"
  | "delete-own";

type TaskPermission =
  | "create"
  | "read-all"
  | "read-assigned"
  | "read-own"
  | "update"
  | "delete"
  | "delete-own"
  | "assign"
  | "update-own";

type InvoicePermission = "read";

type ProjectActor = {
  id: string;
  organizationId: string;
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
  if (!session?.user || isPlatformSuperAdmin(session.user.role)) {
    return null;
  }
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) return null;

  const result = await checkOrganizationPermission({
    headers: requestHeaders,
    body: { permissions: { [resource]: [permission] } },
  });
  return result.success
    ? { id: session.user.id, organizationId }
    : null;
}

async function canAccessProjectForTaskAction(projectId: string, userId: string) {
  return Boolean(await hasPermission("projects", "read-all")) ||
    await canViewProject(projectId, userId);
}

async function getProjectReadActor(): Promise<ProjectActor | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user || isPlatformSuperAdmin(session.user.role)) {
    return null;
  }
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) return null;
  const [readAll, readAssigned, readOwn] = await Promise.all([
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["read-all"] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["read-assigned"] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["read-own"] } },
    }),
  ]);
  if (!readAll.success && !readAssigned.success && !readOwn.success) return null;
  const [viewBudget, manageProjects] = await Promise.all([
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["view-budget"] } },
    }),
    checkOrganizationPermission({
      headers: requestHeaders,
      body: { permissions: { projects: ["update"] } },
    }),
  ]);
  return {
    id: session.user.id,
    organizationId,
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

export async function getProjectTaskWorkspace(input: unknown) {
  const parsed = projectTaskWorkspaceQuerySchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task filters are invalid.", parsed.error.issues);

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    return errorResponse("You do not have permission to view tasks.");
  }
  if (isPlatformSuperAdmin(session.user.role)) {
    return errorResponse("Platform administrators cannot access organization tasks.");
  }
  const user = session.user;
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) {
    return errorResponse("Choose an organization to access project tasks.");
  }
  const checkRolePermission = (
    resource: "projects" | "tasks",
    permission: ProjectPermission | TaskPermission,
  ) => checkOrganizationPermission({
    headers: requestHeaders,
    body: { permissions: { [resource]: [permission] } },
  });
  const [
    readAllUser,
    readAssignedUser,
    readOwnUser,
    updateAllUser,
    updateOwnUser,
    createUser,
    readAllProjectsUser,
    readAssignedProjectsUser,
    readOwnProjectsUser,
  ] =
    await Promise.all([
      checkRolePermission("tasks", "read-all"),
      checkRolePermission("tasks", "read-assigned"),
      checkRolePermission("tasks", "read-own"),
      checkRolePermission("tasks", "update"),
      checkRolePermission("tasks", "update-own"),
      checkRolePermission("tasks", "create"),
      checkRolePermission("projects", "read-all"),
      checkRolePermission("projects", "read-assigned"),
      checkRolePermission("projects", "read-own"),
    ]);
  if (!readAllUser.success && !readAssignedUser.success && !readOwnUser.success) {
    return errorResponse("You do not have permission to view tasks.");
  }

  try {
    const [page, creationProjects] = await Promise.all([
      getProjectTaskWorkspacePage(parsed.data, {
        id: user.id,
        organizationId,
        canReadAll: readAllUser.success,
        canReadAssigned: readAssignedUser.success,
        canReadOwn: readOwnUser.success,
      }),
      createUser.success &&
      (readAllProjectsUser.success || readAssignedProjectsUser.success || readOwnProjectsUser.success)
        ? getTaskCreationProjectOptions(
            organizationId,
            user.id,
            readAllProjectsUser.success,
          )
        : Promise.resolve({ items: [], hasMore: false }),
    ]);
    return successResponse("Tasks loaded.", {
      ...page,
      creationProjects,
      actorId: user.id,
      permissions: {
        canReadAll: readAllUser.success,
        canReadOwn: readOwnUser.success,
        canUpdateTasks: updateAllUser.success,
        canUpdateOwnTasks: updateOwnUser.success,
        canCreateTasks: createUser.success,
        canReadAllProjects: readAllProjectsUser.success,
      },
    });
  } catch (error) {
    return actionError(error, "Unable to load tasks.");
  }
}

export async function getTaskStatusTemplatesAction(projectId: string) {
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to change task workflows.");
  if (typeof projectId !== "string" || projectId.trim().length === 0 || projectId.length > 100) {
    return errorResponse("Project ID is required.");
  }
  const actor = await getProjectReadActor();
  if (!actor || (!actor.canReadAll && !(await canViewProject(projectId, user.id)))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    if (!(await getProjectTaskWorkflow(projectId, actor.organizationId))) {
      return errorResponse("Project not found or you do not have access.");
    }
    return successResponse(
      "Task status templates loaded.",
      await getTaskStatusTemplates(actor.organizationId),
    );
  } catch (error) {
    return actionError(error, "Unable to load task status templates.");
  }
}

export async function updateProjectTaskWorkflowAction(input: unknown) {
  const parsed = projectTaskWorkflowUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse("Task workflow details are invalid.", parsed.error.issues);
  }
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to change task workflows.");
  const actor = await getProjectReadActor();
  if (!actor || (!actor.canReadAll && !(await canViewProject(parsed.data.projectId, user.id)))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    await updateProjectTaskWorkflow({
      ...parsed.data,
      organizationId: actor.organizationId,
      actorId: user.id,
    });
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    revalidatePath("/dashboard/tasks");
    return successResponse("Task workflow updated.");
  } catch (error) {
    return actionError(error, "Unable to update task workflow.");
  }
}

export async function saveTaskStatusTemplateAction(input: unknown) {
  const parsed = projectTaskStatusTemplateInputSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse("Task status template details are invalid.", parsed.error.issues);
  }
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to save task status templates.");
  const actor = await getProjectReadActor();
  if (!actor || (!actor.canReadAll && !(await canViewProject(parsed.data.projectId, user.id)))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    if (!(await getProjectTaskWorkflow(parsed.data.projectId, actor.organizationId))) {
      return errorResponse("Project not found or you do not have access.");
    }
    await saveTaskStatusTemplate({
      ...parsed.data,
      organizationId: actor.organizationId,
      actorId: user.id,
    });
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    return successResponse("Task status template saved.");
  } catch (error) {
    return actionError(error, "Unable to save task status template.");
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
      canEditOwn,
      canChangeStatus,
      canArchive,
      canDeleteOwnProject,
      canCreateTasks,
      canUpdateTasks,
      canUpdateOwnTasks,
      canDeleteTasks,
      canDeleteOwnTasks,
      canManageTeam,
      canReadInvoices,
    ] = await Promise.all([
      hasPermission("projects", "update"),
      hasPermission("projects", "update-own"),
      hasPermission("projects", "update-status"),
      hasPermission("projects", "archive"),
      hasPermission("projects", "delete-own"),
      hasPermission("tasks", "create"),
      hasPermission("tasks", "update"),
      hasPermission("tasks", "update-own"),
      hasPermission("tasks", "delete"),
      hasPermission("tasks", "delete-own"),
      hasPermission("projects", "manage-team"),
      hasPermission("invoices", "read"),
    ]);
    const assignedToProject = await canViewProject(projectId, actor.id);
    const canEditThisProject = Boolean(canEdit) || (Boolean(canEditOwn) && assignedToProject);
    const canArchiveThisProject = Boolean(canArchive) ||
      (Boolean(canDeleteOwnProject) && assignedToProject);
    const relatedInvoices = canReadInvoices
      ? await getRelatedInvoicesForProject(
          actor.organizationId,
          project.customerId,
          project.proposalId,
        )
      : [];
    const statusOptions = (["PLANNING", "NOT_STARTED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"] as const)
      .filter((status) => canTransitionProject(project.status, status));
    return successResponse("Project loaded.", {
      project,
      actorId: actor.id,
      permissions: {
        canEdit: canEditThisProject,
        canChangeStatus: Boolean(canChangeStatus) ||
          (Boolean(canEditOwn) && assignedToProject),
        canArchive: canArchiveThisProject,
        canCreateTasks: Boolean(canCreateTasks),
        canUpdateTasks: Boolean(canUpdateTasks),
        canUpdateOwnTasks: Boolean(canUpdateOwnTasks),
        canDeleteTasks: Boolean(canDeleteTasks),
        canDeleteOwnTasks: Boolean(canDeleteOwnTasks),
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
  if (
    parsed.data.proposalId &&
    !(await getProposalPermissionScope("read", "read-own", parsed.data.proposalId))
  ) {
    return errorResponse("Proposal not found or you do not have access.");
  }

  try {
    const canManageTeam = await hasPermission("projects", "manage-team");
    const [options, customer, proposal, existingProject] = await Promise.all([
      getProjectFormOptions(user.organizationId, canManageTeam ? [user.id] : []),
      parsed.data.customerId
        ? getCustomerForProject(parsed.data.customerId, user.organizationId)
        : Promise.resolve(null),
      parsed.data.proposalId
        ? getProposalForConversion(parsed.data.proposalId, user.organizationId)
        : Promise.resolve(null),
      parsed.data.proposalId
        ? getProjectByProposalId(parsed.data.proposalId, user.organizationId)
        : Promise.resolve(null),
    ]);
    if (parsed.data.customerId && !customer) return errorResponse("Customer not found.");
    if (parsed.data.proposalId && !proposal && !existingProject) {
      return errorResponse("Only an accepted proposal can be converted to a project.");
    }
    const proposalCustomer = proposal && !existingProject
      ? await getCustomerForProject(proposal.customerId, user.organizationId)
      : null;
    if (proposal && !existingProject && !proposalCustomer) {
      return errorResponse("The customer linked to this proposal is unavailable.");
    }
    const selectedCustomer = proposalCustomer ?? customer;

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
  if (typeof projectId !== "string" || projectId.trim().length === 0 || projectId.length > 100) {
    return errorResponse("Project ID is invalid.");
  }
  const [updateUser, updateOwnUser] = await Promise.all([
    hasPermission("projects", "update"),
    hasPermission("projects", "update-own"),
  ]);
  const user = updateUser ?? updateOwnUser;
  if (!user) return errorResponse("You do not have permission to edit projects.");
  const actor = await getProjectReadActor();
  if (!actor) return errorResponse("You do not have permission to view projects.");
  if (!updateUser && !(await canViewProject(projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const project = await getProjectById(projectId, actor);
    if (!project) return errorResponse("Project not found or you do not have access.");
    const [options, canManageBudget] = await Promise.all([
      getProjectFormOptions(actor.organizationId, [
        ...(project.projectManagerId ? [project.projectManagerId] : []),
        ...project.members.map(({ user }) => user.id),
      ]),
      hasPermission("projects", "view-budget"),
    ]);
    return successResponse("Project edit data loaded.", {
      project,
      users: options.users,
      currentUserId: user.id,
      canManageProjects: Boolean(updateUser),
      canManageTeam: false,
      canManageBudget: Boolean(canManageBudget),
    });
  } catch (error) {
    return actionError(error, "Unable to load project edit data.");
  }
}

export async function getProjectTeamContext(projectId: string) {
  const user = await hasPermission("projects", "manage-team");
  if (!user) return errorResponse("You do not have permission to manage project teams.");
  if (typeof projectId !== "string" || projectId.trim().length === 0 || projectId.length > 100) {
    return errorResponse("Project ID is invalid.");
  }
  const actor = await getProjectReadActor();
  if (!actor || (!actor.canReadAll && !(await canViewProject(projectId, user.id)))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const project = await getProjectTeamById(projectId, actor.organizationId);
    if (!project) return errorResponse("Project not found or you do not have access.");
    return successResponse("Project team loaded.", {
      ...project,
      projectCode: formatProjectCode(project.projectNumber),
    });
  } catch (error) {
    return actionError(error, "Unable to load project team.");
  }
}

export async function updateProjectTeamAction(input: unknown) {
  const parsed = projectTeamUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse("Project team details are invalid.", parsed.error.issues);
  }
  const user = await hasPermission("projects", "manage-team");
  if (!user) return errorResponse("You do not have permission to manage project teams.");
  const actor = await getProjectReadActor();
  if (!actor || (!actor.canReadAll && !(await canViewProject(parsed.data.projectId, user.id)))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const project = await updateProjectTeam(
      parsed.data,
      user.id,
      actor.organizationId,
    );
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}/team`);
    return successResponse("Project team updated.", project);
  } catch (error) {
    return actionError(error, "Unable to update project team.");
  }
}

export async function searchProjectUsers(input: unknown) {
  const user = await hasPermission("projects", "manage-team");
  if (!user) return errorResponse("You do not have permission to assign project team members.");
  const parsed = projectUserQuerySchema.safeParse(input);
  if (!parsed.success) return errorResponse("User search is invalid.", parsed.error.issues);

  try {
    const result = await getProjectUserPage(
      user.organizationId,
      parsed.data.search,
      parsed.data.page,
    );
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
    const project = await createProject(
      projectInput,
      user.id,
      user.organizationId,
    );
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
  if (!(await getProposalPermissionScope("read", "read-own", proposalId))) {
    return errorResponse("Proposal not found or you do not have access.");
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
    const project = await convertAcceptedProposalToProject(
      proposalId,
      projectInput,
      user.id,
      user.organizationId,
    );
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
  const parsed = projectUpdateSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Project details are invalid.", parsed.error.issues);
  const [updateUser, updateOwnUser, canManageTeam, canManageBudget] = await Promise.all([
    hasPermission("projects", "update"),
    hasPermission("projects", "update-own"),
    hasPermission("projects", "manage-team"),
    hasPermission("projects", "view-budget"),
  ]);
  const user = updateUser ?? updateOwnUser;
  if (!user) return errorResponse("You do not have permission to edit project details.");
  if (!updateUser && !(await canViewProject(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }
  if (!canManageTeam && (
    parsed.data.projectManagerId !== undefined ||
    parsed.data.teamMemberIds !== undefined
  )) {
    return errorResponse("You do not have permission to change project assignments.");
  }
  if (!canManageBudget && parsed.data.budgetAmount !== undefined) {
    return errorResponse("You do not have permission to change project budgets.");
  }
  if (!updateUser && parsed.data.internalNotes !== undefined) {
    return errorResponse("You do not have permission to change internal project notes.");
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
    const project = await updateProject(
      projectInput,
      user.id,
      user.organizationId,
    );
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
  const [statusUser, adminUser, ownUser] = await Promise.all([
    hasPermission("projects", "update-status"),
    hasPermission("projects", "update"),
    hasPermission("projects", "update-own"),
  ]);
  const user = statusUser ?? adminUser ?? ownUser;
  if (!user) return errorResponse("You do not have permission to change project status.");
  const canReadAllProjects = await hasPermission("projects", "read-all");
  if (!canReadAllProjects && !(await canViewProject(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const result = await updateProjectStatus(
      parsed.data.projectId,
      parsed.data.status,
      user.id,
      user.organizationId,
    );
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    return successResponse("Project status updated.", result);
  } catch (error) {
    return actionError(error, "Unable to update project status.");
  }
}

export async function archiveProjectAction(projectId: string) {
  const [archiveUser, deleteOwnUser] = await Promise.all([
    hasPermission("projects", "archive"),
    hasPermission("projects", "delete-own"),
  ]);
  const user = archiveUser ?? deleteOwnUser;
  if (!user) return errorResponse("You do not have permission to archive projects.");
  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return errorResponse("Project ID is required.");
  }
  if (!archiveUser && !(await canViewProject(projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    await archiveProject(projectId, user.id, user.organizationId);
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
  if (!(await canAccessProjectForTaskAction(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const task = await createProjectTask(
      parsed.data,
      user.id,
      user.organizationId,
    );
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    revalidatePath("/dashboard/tasks");
    return successResponse("Task created.", task);
  } catch (error) {
    return actionError(error, "Unable to create task.");
  }
}

export async function createProjectTaskFolderAction(input: unknown) {
  const parsed = projectTaskFolderCreateSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Folder details are invalid.", parsed.error.issues);
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to manage project folders.");
  if (!(await canAccessProjectForTaskAction(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const folder = await saveProjectTaskFolder({
      ...parsed.data,
      parentId: parsed.data.parentId ?? null,
    });
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    revalidatePath("/dashboard/tasks");
    return successResponse("Folder created.", folder);
  } catch (error) {
    return actionError(error, "Unable to create folder.");
  }
}

export async function updateProjectTaskFolderAction(input: unknown) {
  const parsed = projectTaskFolderUpdateSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Folder details are invalid.", parsed.error.issues);
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to manage project folders.");
  if (!(await canAccessProjectForTaskAction(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    const folder = await saveProjectTaskFolder({
      ...parsed.data,
      parentId: parsed.data.parentId ?? null,
    });
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    revalidatePath("/dashboard/tasks");
    return successResponse("Folder updated.", folder);
  } catch (error) {
    return actionError(error, "Unable to update folder.");
  }
}

export async function deleteProjectTaskFolderAction(input: unknown) {
  const parsed = projectTaskFolderDeleteSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Folder details are invalid.", parsed.error.issues);
  const user = await hasPermission("projects", "update");
  if (!user) return errorResponse("You do not have permission to manage project folders.");
  if (!(await canAccessProjectForTaskAction(parsed.data.projectId, user.id))) {
    return errorResponse("Project not found or you do not have access.");
  }

  try {
    await removeProjectTaskFolder(parsed.data.projectId, parsed.data.folderId);
    revalidatePath(`/dashboard/projects/${parsed.data.projectId}`);
    revalidatePath("/dashboard/tasks");
    return successResponse("Folder deleted. Its tasks and subfolders were moved safely.");
  } catch (error) {
    return actionError(error, "Unable to delete folder.");
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
  if (!isAdmin && !(await canUpdateOwnedTask(parsed.data.taskId, user.id))) {
    return errorResponse("Task not found or you do not have access.");
  }

  try {
    const task = await updateProjectTask(
      parsed.data,
      user.id,
      isAdmin,
      user.organizationId,
    );
    revalidatePath(`/dashboard/projects/${task.projectId}`);
    revalidatePath("/dashboard/tasks");
    return successResponse("Task updated.", task);
  } catch (error) {
    return actionError(error, "Unable to update task.");
  }
}

async function revalidateTaskViews(taskId: string) {
  const organizationId = await getActiveOrganizationId(await headers());
  if (!organizationId) {
    throw new Error("Choose an organization to access project tasks.");
  }
  const task = await findTaskForProject(taskId, organizationId);
  if (task) revalidatePath(`/dashboard/projects/${task.projectId}`);
  revalidatePath("/dashboard/tasks");
}

async function authorizeTaskUpdate(taskId: string) {
  const [updateUser, ownUser] = await Promise.all([
    hasPermission("tasks", "update"),
    hasPermission("tasks", "update-own"),
  ]);
  const user = updateUser ?? ownUser;
  if (!user) return null;
  const task = await findTaskForProject(taskId, user.organizationId);
  if (!task || (!updateUser && !(await canUpdateOwnedTask(taskId, user.id)))) return null;
  return { user, task };
}

async function authorizeTaskTimer(taskId: string) {
  const [updateUser, ownUser] = await Promise.all([
    hasPermission("tasks", "update"),
    hasPermission("tasks", "update-own"),
  ]);
  const user = updateUser ?? ownUser;
  if (!user) return null;
  const task = await findTaskForProject(taskId, user.organizationId);
  if (!task || (!updateUser && !(await canUpdateOwnedTask(taskId, user.id)))) return null;
  return { user, task };
}

export async function getProjectTaskPreviewAction(input: unknown) {
  const parsed = projectTaskIdSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task ID is invalid.", parsed.error.issues);
  const [readAllUser, readAssignedUser, readOwnUser, updateUser, updateOwnUser, createUser] =
    await Promise.all([
      hasPermission("tasks", "read-all"),
      hasPermission("tasks", "read-assigned"),
      hasPermission("tasks", "read-own"),
      hasPermission("tasks", "update"),
      hasPermission("tasks", "update-own"),
      hasPermission("tasks", "create"),
    ]);
  const [readAllProjectsUser, readAssignedProjectsUser, readOwnProjectsUser] = await Promise.all([
    hasPermission("projects", "read-all"),
    hasPermission("projects", "read-assigned"),
    hasPermission("projects", "read-own"),
  ]);
  const user = readAllUser ?? readAssignedUser ?? readOwnUser ?? readAllProjectsUser ?? readAssignedProjectsUser ?? readOwnProjectsUser;
  if (!user) return errorResponse("You do not have permission to view tasks.");

  try {
    const task = await findTaskForProject(
      parsed.data.taskId,
      user.organizationId,
    );
    if (!task) {
      return errorResponse("Task not found or you do not have access.");
    }
    const canReadThroughProject = Boolean(readAllProjectsUser) ||
      Boolean((readAssignedProjectsUser || readOwnProjectsUser) && await canViewProject(task.projectId, user.id));
    const canReadTask = Boolean(readAllUser) ||
      Boolean(readAssignedUser && task.assigneeId === user.id) ||
      Boolean(readOwnUser && (task.assigneeId === user.id || task.createdById === user.id)) ||
      canReadThroughProject;
    if (!canReadTask) return errorResponse("Task not found or you do not have access.");
    const preview = await getProjectTaskPreview(task.id, {
      id: user.id,
      organizationId: user.organizationId,
      canReadAll: Boolean(readAllUser || canReadThroughProject),
      canReadAssigned: Boolean(readAssignedUser),
      canReadOwn: Boolean(readOwnUser),
    });
    if (!preview) return errorResponse("Task not found or you do not have access.");
    const canReadAllProjects = Boolean(await hasPermission("projects", "read-all"));
    const canCreateSubtasks = Boolean(createUser) &&
      (canReadAllProjects ||
        Boolean(await getProjectAssignment(
          task.projectId,
          user.id,
          user.organizationId,
        )));
    return successResponse("Task details loaded.", {
      ...preview,
      actorId: user.id,
      permissions: {
        canUpdate: Boolean(updateUser || (updateOwnUser && await canUpdateOwnedTask(task.id, user.id))),
        canCreateSubtasks,
        canTrackTime: Boolean(updateUser || (updateOwnUser && await canUpdateOwnedTask(task.id, user.id))),
      },
    });
  } catch (error) {
    return actionError(error, "Unable to load task details.");
  }
}

export async function addProjectTaskChecklistItemAction(input: unknown) {
  const parsed = projectTaskChecklistInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Checklist item is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to update this task.");
  try {
    const item = await createProjectTaskChecklistItem(parsed.data.taskId, parsed.data.title);
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Checklist item added.", item);
  } catch (error) {
    return actionError(error, "Unable to add checklist item.");
  }
}

export async function updateProjectTaskChecklistItemAction(input: unknown) {
  const parsed = projectTaskChecklistUpdateSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Checklist update is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to update this task.");
  try {
    await updateProjectTaskChecklistItem(
      parsed.data.taskId,
      parsed.data.itemId,
      parsed.data.isComplete,
    );
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Checklist updated.");
  } catch (error) {
    return actionError(error, "Unable to update checklist item.");
  }
}

export async function removeProjectTaskChecklistItemAction(input: unknown) {
  const parsed = projectTaskChecklistDeleteSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Checklist item is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to update this task.");
  try {
    await removeProjectTaskChecklistItem(parsed.data.taskId, parsed.data.itemId);
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Checklist item removed.");
  } catch (error) {
    return actionError(error, "Unable to remove checklist item.");
  }
}

export async function addProjectTaskDependencyAction(input: unknown) {
  const parsed = projectTaskDependencyInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task dependency is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to update this task.");
  try {
    await createProjectTaskDependency(
      parsed.data.taskId,
      parsed.data.dependsOnTaskId,
      parsed.data.relationType,
    );
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Dependency added.");
  } catch (error) {
    return actionError(error, "Unable to add task dependency.");
  }
}

export async function removeProjectTaskDependencyAction(input: unknown) {
  const parsed = projectTaskDependencyDeleteSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task dependency is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to update this task.");
  try {
    await removeProjectTaskDependency(parsed.data.taskId, parsed.data.dependencyId);
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Dependency removed.");
  } catch (error) {
    return actionError(error, "Unable to remove task dependency.");
  }
}

export async function addProjectTaskAttachmentAction(input: unknown) {
  const parsed = projectTaskAttachmentInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task attachment is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to update this task.");
  try {
    await createProjectTaskAttachment(parsed.data, context.user.id);
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Attachment added.");
  } catch (error) {
    return actionError(error, "Unable to add task attachment.");
  }
}

export async function removeProjectTaskAttachmentAction(input: unknown) {
  const parsed = projectTaskAttachmentDeleteSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task attachment is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to update this task.");
  try {
    await removeProjectTaskAttachment(parsed.data.taskId, parsed.data.attachmentId);
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Attachment removed.");
  } catch (error) {
    return actionError(error, "Unable to remove task attachment.");
  }
}

export async function addProjectTaskCommentAction(input: unknown) {
  const parsed = projectTaskCommentInputSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task comment is invalid.", parsed.error.issues);
  const context = await authorizeTaskUpdate(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to comment on this task.");
  try {
    const comment = await createProjectTaskComment(
      parsed.data.taskId,
      context.user.id,
      parsed.data.content,
    );
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Comment added.", comment);
  } catch (error) {
    return actionError(error, "Unable to add task comment.");
  }
}

export async function startProjectTaskTimerAction(input: unknown) {
  const parsed = projectTaskTimerSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task ID is invalid.", parsed.error.issues);
  const context = await authorizeTaskTimer(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to track time on this task.");
  try {
    await startProjectTaskTimer(parsed.data.taskId, context.user.id);
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Timer started.");
  } catch (error) {
    return actionError(error, "Unable to start task timer.");
  }
}

export async function stopProjectTaskTimerAction(input: unknown) {
  const parsed = projectTaskTimerSchema.safeParse(input);
  if (!parsed.success) return errorResponse("Task ID is invalid.", parsed.error.issues);
  const context = await authorizeTaskTimer(parsed.data.taskId);
  if (!context) return errorResponse("You do not have permission to track time on this task.");
  try {
    await stopProjectTaskTimer(parsed.data.taskId, context.user.id);
    await revalidateTaskViews(parsed.data.taskId);
    return successResponse("Timer stopped.");
  } catch (error) {
    return actionError(error, "Unable to stop task timer.");
  }
}

export async function deleteProjectTaskAction(taskId: string) {
  const [deleteUser, deleteOwnUser] = await Promise.all([
    hasPermission("tasks", "delete"),
    hasPermission("tasks", "delete-own"),
  ]);
  const user = deleteUser ?? deleteOwnUser;
  if (!user) return errorResponse("You do not have permission to delete tasks.");
  if (typeof taskId !== "string" || taskId.trim().length === 0) {
    return errorResponse("Task ID is required.");
  }
  if (!deleteUser && !(await canUpdateOwnedTask(taskId, user.id))) {
    return errorResponse("Task not found or you do not have access.");
  }

  try {
    const result = await deleteProjectTask(taskId, user.id);
    if (!result) return errorResponse("Task not found or you do not have access.");
    revalidatePath("/dashboard/projects");
    revalidatePath(`/dashboard/projects/${result.projectId}`);
    revalidatePath("/dashboard/tasks");
    return successResponse("Task removed.");
  } catch (error) {
    return actionError(error, "Unable to remove task.");
  }
}
