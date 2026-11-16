"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EmploymentStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrganizationManagerContext } from "@/lib/organization-manager";
import { organizationCustomRoleStatement } from "@/lib/organization-permissions";

const pagePath = "/dashboard/organization-management";
const identifierSchema = z.string().trim().min(1).max(128);
const roleNameSchema = z.string().trim().regex(
  /^[a-z][a-z0-9_-]{0,62}$/,
  "Use a lowercase role name with letters, numbers, hyphens, or underscores.",
);
const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const teamNameSchema = z.string().trim().min(1, "Enter a team name.").max(80);

export type OrganizationManagementActionState = {
  error?: string;
  success?: string;
};

const availablePermissions = new Set(
  Object.entries(organizationCustomRoleStatement).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}:${action}`),
  ),
);

function memberHasOwnerRole(role: string) {
  return role.split(",").some((memberRole) => memberRole.trim() === "owner");
}

function readPermissions(formData: FormData) {
  const parsed = z
    .array(z.string().refine((value) => availablePermissions.has(value)))
    .safeParse(formData.getAll("permissions"));
  if (!parsed.success) {
    return null;
  }

  const permissions: Record<string, string[]> = {};
  for (const value of new Set(parsed.data)) {
    const separator = value.indexOf(":");
    const resource = value.slice(0, separator);
    const permission = value.slice(separator + 1);
    permissions[resource] = [...(permissions[resource] ?? []), permission];
  }
  return permissions;
}

async function roleIsAssignable(organizationId: string, role: string) {
  if (role === "owner") return false;
  if (role === "admin" || role === "member") return true;

  const customRole = await prisma.organizationRole.findUnique({
    where: {
      organizationId_role: { organizationId, role },
    },
    select: { id: true },
  });
  return Boolean(customRole);
}

function apiError(error: unknown, fallback: string): OrganizationManagementActionState {
  if (error instanceof APIError) return { error: error.message };
  throw error instanceof Error ? error : new Error(fallback);
}

export async function inviteOrganizationMember(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsed = z.object({
    email: emailSchema,
    role: roleNameSchema,
    teamId: z.string().trim().max(128).transform((teamId) =>
      teamId === "none" ? undefined : teamId || undefined,
    ),
  }).safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    teamId: formData.get("teamId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter valid invitation details." };
  }

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage members." };
  if (!(await roleIsAssignable(context.organizationId, parsed.data.role))) {
    return { error: "Choose an available organization role." };
  }
  if (parsed.data.teamId) {
    const team = await prisma.team.findFirst({
      where: {
        id: parsed.data.teamId,
        organizationId: context.organizationId,
      },
      select: { id: true },
    });
    if (!team) return { error: "Choose a team from this organization." };
  }

  try {
    await auth.api.createInvitation({
      headers: context.requestHeaders,
      body: {
        organizationId: context.organizationId,
        email: parsed.data.email,
        role: parsed.data.role,
        ...(parsed.data.teamId ? { teamId: parsed.data.teamId } : {}),
      },
    });
  } catch (error) {
    return apiError(error, "Could not send this invitation.");
  }

  revalidatePath(pagePath);
  return { success: `Invitation sent to ${parsed.data.email}.` };
}

export async function cancelOrganizationMemberInvitation(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsedId = identifierSchema.safeParse(formData.get("invitationId"));
  if (!parsedId.success) return { error: "Choose a valid invitation." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage members." };
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: parsedId.data,
      organizationId: context.organizationId,
      status: "pending",
      role: { not: "owner" },
    },
    select: { id: true },
  });
  if (!invitation) return { error: "This invitation is no longer pending." };

  try {
    await auth.api.cancelInvitation({
      headers: context.requestHeaders,
      body: { invitationId: invitation.id },
    });
  } catch (error) {
    return apiError(error, "Could not cancel this invitation.");
  }

  revalidatePath(pagePath);
  return { success: "Invitation canceled." };
}

export async function updateOrganizationMemberRole(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsed = z.object({
    memberId: identifierSchema,
    role: roleNameSchema,
  }).safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a valid role." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage members." };
  const member = await prisma.member.findFirst({
    where: { id: parsed.data.memberId, organizationId: context.organizationId },
    select: { role: true, userId: true },
  });
  if (!member) return { error: "This organization member could not be found." };
  if (memberHasOwnerRole(member.role)) {
    return { error: "The organization owner role cannot be changed here." };
  }
  if (member.userId === context.session.user.id) {
    return { error: "You cannot change your own organization role." };
  }
  if (!(await roleIsAssignable(context.organizationId, parsed.data.role))) {
    return { error: "Choose an available organization role." };
  }

  try {
    await auth.api.updateMemberRole({
      headers: context.requestHeaders,
      body: {
        organizationId: context.organizationId,
        memberId: parsed.data.memberId,
        role: parsed.data.role,
      },
    });
  } catch (error) {
    return apiError(error, "Could not update this member's role.");
  }

  revalidatePath(pagePath);
  return { success: "Member role updated." };
}

export async function removeOrganizationMember(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsedId = identifierSchema.safeParse(formData.get("memberId"));
  if (!parsedId.success) return { error: "Choose a valid organization member." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage members." };
  const member = await prisma.member.findFirst({
    where: { id: parsedId.data, organizationId: context.organizationId },
    select: { role: true, userId: true },
  });
  if (!member) return { error: "This organization member could not be found." };
  if (memberHasOwnerRole(member.role)) {
    return { error: "The organization owner cannot be removed here." };
  }
  if (member.userId === context.session.user.id) {
    return { error: "You cannot remove your own organization access." };
  }

  try {
    await auth.api.removeMember({
      headers: context.requestHeaders,
      body: {
        organizationId: context.organizationId,
        memberIdOrEmail: parsedId.data,
      },
    });
  } catch (error) {
    return apiError(error, "Could not remove this member.");
  }

  revalidatePath(pagePath);
  return { success: "Member removed from the organization." };
}

export async function createOrganizationTeam(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsedName = teamNameSchema.safeParse(formData.get("name"));
  if (!parsedName.success) return { error: parsedName.error.issues[0]?.message ?? "Enter a team name." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage teams." };

  try {
    await auth.api.createTeam({
      headers: context.requestHeaders,
      body: { organizationId: context.organizationId, name: parsedName.data },
    });
  } catch (error) {
    return apiError(error, "Could not create this team.");
  }

  revalidatePath(pagePath);
  return { success: "Team created." };
}

export async function updateOrganizationTeam(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsed = z.object({
    teamId: identifierSchema,
    name: teamNameSchema,
  }).safeParse({
    teamId: formData.get("teamId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid team name." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage teams." };
  const team = await prisma.team.findFirst({
    where: { id: parsed.data.teamId, organizationId: context.organizationId },
    select: { id: true },
  });
  if (!team) return { error: "This team could not be found." };

  try {
    await auth.api.updateTeam({
      headers: context.requestHeaders,
      body: { teamId: team.id, data: { name: parsed.data.name } },
    });
  } catch (error) {
    return apiError(error, "Could not update this team.");
  }

  revalidatePath(pagePath);
  return { success: "Team updated." };
}

export async function removeOrganizationTeam(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsedId = identifierSchema.safeParse(formData.get("teamId"));
  if (!parsedId.success) return { error: "Choose a valid team." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage teams." };
  const team = await prisma.team.findFirst({
    where: { id: parsedId.data, organizationId: context.organizationId },
    select: { id: true },
  });
  if (!team) return { error: "This team could not be found." };

  try {
    await auth.api.removeTeam({
      headers: context.requestHeaders,
      body: { teamId: team.id, organizationId: context.organizationId },
    });
  } catch (error) {
    return apiError(error, "Could not remove this team.");
  }

  revalidatePath(pagePath);
  return { success: "Team removed." };
}

export async function addOrganizationTeamMember(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsed = z.object({
    teamId: identifierSchema,
    userId: identifierSchema,
  }).safeParse({
    teamId: formData.get("teamId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { error: "Choose a team member." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage teams." };
  const [team, member] = await Promise.all([
    prisma.team.findFirst({
      where: { id: parsed.data.teamId, organizationId: context.organizationId },
      select: { id: true },
    }),
    prisma.member.findFirst({
      where: {
        organizationId: context.organizationId,
        userId: parsed.data.userId,
      },
      select: {
        userId: true,
        user: { select: { employmentStatus: true } },
      },
    }),
  ]);
  if (!team || !member) return { error: "Choose a member and team from this organization." };
  if (member.user.employmentStatus !== EmploymentStatus.ACTIVE) {
    return { error: "Inactive users cannot be added to a team." };
  }

  try {
    await auth.api.addTeamMember({
      headers: context.requestHeaders,
      body: { teamId: team.id, userId: member.userId },
    });
  } catch (error) {
    return apiError(error, "Could not add this member to the team.");
  }

  revalidatePath(pagePath);
  return { success: "Member added to the team." };
}

export async function removeOrganizationTeamMember(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsed = z.object({
    teamId: identifierSchema,
    userId: identifierSchema,
  }).safeParse({
    teamId: formData.get("teamId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { error: "Choose a valid team member." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage teams." };
  const [team, member] = await Promise.all([
    prisma.team.findFirst({
      where: { id: parsed.data.teamId, organizationId: context.organizationId },
      select: { id: true },
    }),
    prisma.member.findFirst({
      where: {
        organizationId: context.organizationId,
        userId: parsed.data.userId,
      },
      select: { userId: true },
    }),
  ]);
  if (!team || !member) return { error: "Choose a member and team from this organization." };

  try {
    await auth.api.removeTeamMember({
      headers: context.requestHeaders,
      body: { teamId: team.id, userId: member.userId },
    });
  } catch (error) {
    return apiError(error, "Could not remove this member from the team.");
  }

  revalidatePath(pagePath);
  return { success: "Member removed from the team." };
}

export async function createOrganizationRole(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsedName = roleNameSchema.safeParse(formData.get("role"));
  if (!parsedName.success) return { error: parsedName.error.issues[0]?.message ?? "Enter a valid role name." };
  if (["owner", "admin", "member"].includes(parsedName.data)) {
    return { error: "Choose a different name; this role is built in." };
  }
  const permission = readPermissions(formData);
  if (!permission) return { error: "One or more selected permissions are invalid." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage permissions." };

  try {
    await auth.api.createOrgRole({
      headers: context.requestHeaders,
      body: {
        organizationId: context.organizationId,
        role: parsedName.data,
        permission,
      },
    });
  } catch (error) {
    return apiError(error, "Could not create this role.");
  }

  revalidatePath(pagePath);
  return { success: "Custom role created." };
}

export async function updateOrganizationRolePermissions(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsedRole = roleNameSchema.safeParse(formData.get("role"));
  if (!parsedRole.success) return { error: "Choose a valid custom role." };
  if (["owner", "admin", "member"].includes(parsedRole.data)) {
    return { error: "Built-in roles cannot be changed." };
  }
  const permission = readPermissions(formData);
  if (!permission) return { error: "One or more selected permissions are invalid." };

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage permissions." };

  try {
    await auth.api.updateOrgRole({
      headers: context.requestHeaders,
      body: {
        organizationId: context.organizationId,
        roleName: parsedRole.data,
        data: { permission },
      },
    });
  } catch (error) {
    return apiError(error, "Could not update this role.");
  }

  revalidatePath(pagePath);
  return { success: "Role permissions updated." };
}

export async function deleteOrganizationRole(
  _previousState: OrganizationManagementActionState,
  formData: FormData,
): Promise<OrganizationManagementActionState> {
  const parsedRole = roleNameSchema.safeParse(formData.get("role"));
  if (!parsedRole.success) return { error: "Choose a valid custom role." };
  if (["owner", "admin", "member"].includes(parsedRole.data)) {
    return { error: "Built-in roles cannot be deleted." };
  }

  const context = await getOrganizationManagerContext();
  if (!context) return { error: "Only organization owners and admins can manage permissions." };
  const assignedMembers = await prisma.member.findMany({
    where: { organizationId: context.organizationId },
    select: { role: true },
  });
  if (
    assignedMembers.some((member) =>
      member.role.split(",").some((role) => role.trim() === parsedRole.data),
    )
  ) {
    return { error: "Reassign members before deleting this role." };
  }

  try {
    await auth.api.deleteOrgRole({
      headers: context.requestHeaders,
      body: {
        organizationId: context.organizationId,
        roleName: parsedRole.data,
      },
    });
  } catch (error) {
    return apiError(error, "Could not delete this role.");
  }

  revalidatePath(pagePath);
  return { success: "Custom role deleted." };
}
