import { UserRole } from "@/app/generated/prisma/enums";

type RoutePermission = {
  path: string;
  roles: UserRole[]; // Roles allowed to access this path (and its sub-paths)
};

// Define your route restrictions here.
// Routes not listed in this array are accessible to all authenticated users by default.
export const routePermissions: RoutePermission[] = [
  // Accessible by all authenticated roles (SUPER_ADMIN, ADMIN, STAFF)
  {
    path: "/dashboard/customers",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },
  {
    path: "/dashboard/proposals",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },
  {
    path: "/dashboard/invoices",
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

  // Accessible only by SUPER_ADMIN and ADMIN (STAFF denied)
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
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
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
export function canAccessRoute(pathname: string, userRole: UserRole): boolean {
  for (const route of routePermissions) {
    if (pathname.startsWith(route.path)) {
      // If the route matches a restricted path, check if the user's role is in the allowed list
      if (!route.roles.includes(userRole)) {
        return false;
      }
    }
  }
  
  // If the path doesn't match any restricted routes, allow access
  return true;
}
