import { EmploymentStatus } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

const managerRoles = new Set(["owner", "admin"]);

export function isOrganizationManagerRole(role: string) {
  return role.split(",").some((memberRole) => managerRoles.has(memberRole.trim()));
}

export async function getOrganizationManagerContext() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user || isPlatformSuperAdmin(session.user.role)) return null;

  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) return null;

  const [user, membership] = await Promise.all([
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
      select: { role: true },
    }),
  ]);

  if (
    user?.employmentStatus !== EmploymentStatus.ACTIVE ||
    !membership ||
    !isOrganizationManagerRole(membership.role)
  ) {
    return null;
  }

  return { requestHeaders, session, organizationId };
}
