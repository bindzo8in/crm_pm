import { OrganizationManagement } from "@/components/organization/organization-management";
import { getOrganizationManagerContext } from "@/lib/organization-manager";
import { organizationCustomRoleStatement } from "@/lib/organization-permissions";
import prisma from "@/lib/prisma";
import { EmploymentStatus } from "@/app/generated/prisma/enums";
import { notFound, redirect } from "next/navigation";

function readRolePermissions(permission: string) {
  const parsed: unknown = JSON.parse(permission);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("An organization role has invalid permission data.");
  }

  const permissions: string[] = [];
  for (const [resource, actions] of Object.entries(parsed)) {
    if (!Array.isArray(actions) || !actions.every((action) => typeof action === "string")) {
      throw new Error(`The "${resource}" role permissions are invalid.`);
    }
    permissions.push(...actions.map((action) => `${resource}:${action}`));
  }
  return permissions;
}

export default async function OrganizationManagementPage() {
  const context = await getOrganizationManagerContext();
  if (!context) redirect("/dashboard");

  const [organization, memberships, invitations, teams, roles] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: context.organizationId },
      select: { name: true, slug: true },
    }),
    prisma.member.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        userId: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
            employmentStatus: true,
          },
        },
      },
    }),
    prisma.invitation.findMany({
      where: {
        organizationId: context.organizationId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, teamId: true, expiresAt: true },
    }),
    prisma.team.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        members: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.organizationRole.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { role: "asc" },
      select: { role: true, permission: true },
    }),
  ]);
  if (!organization) notFound();

  const activeMemberships = memberships.filter(
    (membership) => membership.user.employmentStatus === EmploymentStatus.ACTIVE,
  );
  const permissionOptions = Object.entries(organizationCustomRoleStatement).flatMap(
    ([resource, actions]) =>
      actions.map((action) => ({
        resource,
        action,
        value: `${resource}:${action}`,
      })),
  );
  const teamsByUserId = new Map<string, { id: string; name: string }[]>();
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  for (const team of teams) {
    for (const member of team.members) {
      const userTeams = teamsByUserId.get(member.userId) ?? [];
      userTeams.push({ id: team.id, name: team.name });
      teamsByUserId.set(member.userId, userTeams);
    }
  }

  return (
    <OrganizationManagement
      organizationName={organization.name}
      workspaceSlug={organization.slug}
      members={activeMemberships.map((membership) => ({
        id: membership.id,
        userId: membership.userId,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
        teams: teamsByUserId.get(membership.userId) ?? [],
      }))}
      invitations={invitations.map((invitation) => ({
        ...invitation,
        teamName: invitation.teamId
          ? teamNameById.get(invitation.teamId) ?? null
          : null,
      }))}
      teams={teams.map((team) => ({
        id: team.id,
        name: team.name,
        members: team.members.map((member) => ({
          userId: member.userId,
          name: member.user.name,
          email: member.user.email,
        })),
      }))}
      roles={roles.map((role) => ({
        role: role.role,
        permissions: readRolePermissions(role.permission).filter((permission) =>
          permissionOptions.some((option) => option.value === permission),
        ),
      }))}
      permissionOptions={permissionOptions}
    />
  );
}
