import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessRoute } from "@/lib/route-permissions";
import { UserRole } from "@/app/generated/prisma/enums";

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

  const pathname = targetPath || headersList.get("x-pathname") || "/dashboard";
  const userRole = session.user.role as UserRole;

  if (!canAccessRoute(pathname, userRole)) {
    console.log('Access denied for route:', pathname, 'User role:', userRole);
    redirect("/dashboard");
  }

  return session;
}
