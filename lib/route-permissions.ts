import { UserRole } from "@/app/generated/prisma/enums";
import { BUSINESS_WORKSPACE_DEPARTMENTS } from "@/lib/workspace-access";

type RoutePermission = {
  path: string;
  roles: UserRole[]; // Roles allowed to access this path (and its sub-paths)
  departmentRoles?: Partial<Record<UserRole, readonly string[]>>;
};

// Define your route restrictions here.
// Routes not listed in this array are accessible to all authenticated users by default.
export const routePermissions: RoutePermission[] = [
  // Business records are available to admins and staff in HR or Sales.
  {
    path: "/dashboard/customers",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
    departmentRoles: { [UserRole.STAFF]: BUSINESS_WORKSPACE_DEPARTMENTS },
  },
  {
    path: "/dashboard/proposals",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
    departmentRoles: { [UserRole.STAFF]: BUSINESS_WORKSPACE_DEPARTMENTS },
  },
  {
    path: "/dashboard/invoices",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
    departmentRoles: { [UserRole.STAFF]: BUSINESS_WORKSPACE_DEPARTMENTS },
  },
  {
    path: "/dashboard/finance",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },
  {
    path: "/dashboard/projects",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },
  {
    path: "/dashboard/tasks",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },
  {
    path: "/dashboard/account",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]
  },
  {
    path: "/dashboard/attendance",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]
  },
  {
    path: "/dashboard/leaves",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]
  },
  {
    path: "/attendance",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]
  },

  // Administrative configuration routes; the holiday calendar is intentionally staff-readable.
  {
    path: "/dashboard/services",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    path: "/dashboard/terms",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    path: "/dashboard/reports",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    path: "/dashboard/users",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
    departmentRoles: { [UserRole.STAFF]: ["HR"] },
  },
  {
    path: "/dashboard/holidays",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },
  {
    path: "/dashboard/tariffs",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    path: "/dashboard/salary",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
    departmentRoles: { [UserRole.STAFF]: ["HR"] },
  },

  // Accessible only by SUPER_ADMIN (ADMIN and STAFF denied)
  {
    path: "/dashboard/settings",
    roles: [UserRole.SUPER_ADMIN],
  },

];

/**
 * Checks if a user role has permission to access a specific route.
 * @param pathname The current request pathname
 * @param userRole The role of the logged-in user
 * @returns boolean indicating whether access is granted
 */
export function canAccessRoute(
  pathname: string,
  userRole: UserRole,
  department?: string | null,
): boolean {
  for (const route of routePermissions) {
    if (pathname.startsWith(route.path)) {
      if (!route.roles.includes(userRole)) {
        return false;
      }
      const allowedDepartments = route.departmentRoles?.[userRole];
      if (allowedDepartments && !allowedDepartments.includes(department ?? "")) {
        return false;
      }
    }
  }

  // If the path doesn't match any restricted routes, allow access
  return true;
}
