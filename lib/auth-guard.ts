import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrganizationRoutePermissions } from "@/lib/route-permissions";
import { EmploymentStatus } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { isPlatformSuperAdmin } from "@/lib/global-role";

/**
 * Ensures the user is authenticated and has permission to access the specified route.
 * Call this at the top of Server Components (page.tsx).
 *
 * @param targetPath Optional explicit route path to check against routePermissions.
 *                   If omitted, attempts to read 'x-pathname' header injected by proxy.ts.
 */
export async function requirePageAccess(targetPath?: string) {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session) {
    redirect("/signin");
  }
  if (isPlatformSuperAdmin(session.user.role)) {
    redirect("/platform/organizations");
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { employmentStatus: true },
  });
  if (!user || user.employmentStatus !== EmploymentStatus.ACTIVE) {
    redirect("/signin");
  }

  const requestPath = headersList.get("x-pathname");
  const pathname =
    requestPath && (!targetPath || requestPath.startsWith(targetPath))
      ? requestPath
      : targetPath || requestPath || "/dashboard";
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    redirect("/dashboard/organizations");
  }

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
    select: { id: true },
  });
  if (!member) {
    redirect("/dashboard/organizations");
  }

  const requiredPermissions = getOrganizationRoutePermissions(pathname);
  if (requiredPermissions) {
    const permissionResults = await Promise.all(
      requiredPermissions.map(({ resource, permission }) =>
        auth.api.hasPermission({
          headers: headersList,
          body: {
            organizationId,
            permissions: { [resource]: [permission] },
          },
        }),
      ),
    );
    if (!permissionResults.some((result) => result.success)) {
      redirect("/dashboard/organizations");
    }
  }

  return session;
}
