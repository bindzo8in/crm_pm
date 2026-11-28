import { EmploymentStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { organizationStatement } from "@/lib/organization-permissions";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

type OrganizationResource = keyof typeof organizationStatement;
type OrganizationPermission<Resource extends OrganizationResource> =
  (typeof organizationStatement)[Resource][number];

type OrganizationPermissionMap = {
  [Resource in OrganizationResource]?: OrganizationPermission<Resource>[];
};

export async function getActiveOrganizationId(
  requestHeaders?: Headers,
): Promise<string | null> {
  const resolvedHeaders = requestHeaders ?? (await headers());
  const session = await auth.api.getSession({ headers: resolvedHeaders });
  const organizationId = session?.session.activeOrganizationId;
  if (
    !session?.user ||
    isPlatformSuperAdmin(session.user.role) ||
    !organizationId
  ) {
    return null;
  }

  const [user, member] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { employmentStatus: true },
    }),
    prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
      select: { id: true },
    }),
  ]);
  if (user?.employmentStatus !== EmploymentStatus.ACTIVE || !member) return null;

  return organizationId;
}

export async function checkOrganizationPermission({
  headers: providedHeaders,
  body,
}: {
  headers?: Headers;
  body: { permissions: OrganizationPermissionMap };
}): Promise<{ success: boolean }> {
  const requestHeaders = providedHeaders ?? (await headers());
  const session = await auth.api.getSession({ headers: requestHeaders });
  const organizationId = session?.session.activeOrganizationId;
  if (
    !session?.user ||
    isPlatformSuperAdmin(session.user.role) ||
    !organizationId
  ) {
    return { success: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { employmentStatus: true },
  });
  if (user?.employmentStatus !== EmploymentStatus.ACTIVE) {
    return { success: false };
  }

  const result = await auth.api.hasPermission({
    headers: requestHeaders,
    body: {
      organizationId,
      permissions: body.permissions,
    },
  });
  return { success: result.success };
}

export async function hasOrganizationPermission<
  Resource extends OrganizationResource,
>(
  resource: Resource,
  permission: OrganizationPermission<Resource>,
): Promise<boolean> {
  const result = await checkOrganizationPermission({
    body: { permissions: { [resource]: [permission] } },
  });
  return result.success;
}
