import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getInitialSetupStatus } from "@/lib/initial-setup";
import { isOrganizationSetupOwner } from "@/lib/organization-setup-access";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import { checkOrganizationPermission } from "@/lib/organization-authorization";
import prisma from "@/lib/prisma";
type Session = typeof auth.$Infer.Session
export interface AttendanceUserPermissions {
  session: Session;
  user: Session["user"];
  isAuthorized: boolean;
}

/**
 * Ensures the user is authenticated and has organization-scoped attendance access.
 */
export async function requireAttendanceAccess(
  requiredPermission: "read" | "manage" = "read",
): Promise<AttendanceUserPermissions> {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session || !session.user) {
    redirect("/signin");
  }
  if (isPlatformSuperAdmin(session.user.role)) {
    redirect("/platform/organizations");
  }

  const organizationId = session.session.activeOrganizationId;
  if (organizationId) {
    const membership = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });
    if (
      isOrganizationSetupOwner(membership?.role) &&
      !(await getInitialSetupStatus(organizationId)).complete
    ) {
      redirect("/onboarding");
    }
  }

  let isAuthorized: boolean;
  if (requiredPermission === "manage") {
    const canManage = await checkOrganizationPermission({
      headers: reqHeaders,
      body: { permissions: { attendance: ["manage"] } },
    });
    isAuthorized = canManage.success;
  } else {
    const [canReadOwn, canReadAll] = await Promise.all([
      checkOrganizationPermission({
        headers: reqHeaders,
        body: { permissions: { attendance: ["read-own"] } },
      }),
      checkOrganizationPermission({
        headers: reqHeaders,
        body: { permissions: { attendance: ["read-all"] } },
      }),
    ]);
    isAuthorized = canReadOwn.success || canReadAll.success;
  }

  return {
    session,
    user: session.user,
    isAuthorized,
  };
}
