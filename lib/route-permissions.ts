import { UserRole } from "@/app/generated/prisma/enums";
import { BUSINESS_WORKSPACE_DEPARTMENTS } from "@/lib/workspace-access";

type RoutePermission = {
  path: string;
  roles: UserRole[]; // Roles allowed to access this path (and its sub-paths)
  departmentRoles?: Partial<Record<UserRole, readonly string[]>>;
};

export type OrganizationRoutePermission = {
  resource: string;
  permission: string;
};

const organizationRoutePermissions: Array<{
  path: string;
  anyOf: OrganizationRoutePermission[];
}> = [
  { path: "/dashboard", anyOf: [{ resource: "dashboard", permission: "read" }] },
  { path: "/dashboard/attendance/schedule", anyOf: [{ resource: "attendance", permission: "manage" }] },
  {
    path: "/dashboard/customers",
    anyOf: [
      { resource: "customers", permission: "read" },
      { resource: "customers", permission: "read-own" },
    ],
  },
  { path: "/dashboard/customers/create", anyOf: [{ resource: "customers", permission: "create" }] },
  { path: "/dashboard/customers/:id/edit", anyOf: [{ resource: "customers", permission: "update" }] },
  {
    path: "/dashboard/proposals",
    anyOf: [
      { resource: "proposals", permission: "read" },
      { resource: "proposals", permission: "read-own" },
    ],
  },
  { path: "/dashboard/proposals/create", anyOf: [{ resource: "proposals", permission: "create" }] },
  ...(["edit", "builder", "composer"] as const).map((page) => ({
    path: `/dashboard/proposals/:id/${page}`,
    anyOf: [
      { resource: "proposals", permission: "update" },
      { resource: "proposals", permission: "update-own" },
    ],
  })),
  {
    path: "/dashboard/invoices",
    anyOf: [
      { resource: "invoices", permission: "read" },
      { resource: "invoices", permission: "read-own" },
    ],
  },
  { path: "/dashboard/invoices/create", anyOf: [{ resource: "invoices", permission: "create" }] },
  {
    path: "/dashboard/invoices/:id/edit",
    anyOf: [
      { resource: "invoices", permission: "update" },
      { resource: "invoices", permission: "update-own" },
    ],
  },
  { path: "/dashboard/finance", anyOf: [{ resource: "finance", permission: "read" }] },
  { path: "/dashboard/finance/expenses/create", anyOf: [{ resource: "finance", permission: "create" }] },
  { path: "/dashboard/finance/expenses/:id/edit", anyOf: [{ resource: "finance", permission: "update" }] },
  {
    path: "/dashboard/projects",
    anyOf: [
      { resource: "projects", permission: "read-all" },
      { resource: "projects", permission: "read-assigned" },
      { resource: "projects", permission: "read-own" },
    ],
  },
  { path: "/dashboard/projects/new", anyOf: [{ resource: "projects", permission: "create" }] },
  {
    path: "/dashboard/projects/:id/edit",
    anyOf: [
      { resource: "projects", permission: "update" },
      { resource: "projects", permission: "update-own" },
    ],
  },
  { path: "/dashboard/projects/:id/team", anyOf: [{ resource: "projects", permission: "manage-team" }] },
  {
    path: "/dashboard/tasks",
    anyOf: [
      { resource: "tasks", permission: "read-all" },
      { resource: "tasks", permission: "read-assigned" },
      { resource: "tasks", permission: "read-own" },
    ],
  },
  { path: "/dashboard/account", anyOf: [{ resource: "account", permission: "read" }] },
  {
    path: "/dashboard/attendance",
    anyOf: [
      { resource: "attendance", permission: "read-all" },
      { resource: "attendance", permission: "read-own" },
    ],
  },
  {
    path: "/dashboard/leaves",
    anyOf: [
      { resource: "leave", permission: "read-all" },
      { resource: "leave", permission: "read-own" },
    ],
  },
  {
    path: "/dashboard/issues",
    anyOf: [
      { resource: "issueReports", permission: "read-all" },
      { resource: "issueReports", permission: "read-own" },
    ],
  },
  {
    path: "/attendance",
    anyOf: [
      { resource: "attendance", permission: "read-own" },
      { resource: "attendance", permission: "read-all" },
    ],
  },
  { path: "/dashboard/services", anyOf: [{ resource: "services", permission: "read" }] },
  { path: "/dashboard/services/create", anyOf: [{ resource: "services", permission: "create" }] },
  { path: "/dashboard/services/:id/edit", anyOf: [{ resource: "services", permission: "update" }] },
  { path: "/dashboard/services/:id/create-package", anyOf: [{ resource: "services", permission: "create" }] },
  { path: "/dashboard/services/:id/edit-package", anyOf: [{ resource: "services", permission: "update" }] },
  { path: "/dashboard/products", anyOf: [{ resource: "products", permission: "read" }] },
  { path: "/dashboard/products/create", anyOf: [{ resource: "products", permission: "create" }] },
  { path: "/dashboard/products/:id/edit", anyOf: [{ resource: "products", permission: "update" }] },
  { path: "/dashboard/terms", anyOf: [{ resource: "terms", permission: "read" }] },
  { path: "/dashboard/terms/create", anyOf: [{ resource: "terms", permission: "create" }] },
  { path: "/dashboard/terms/:id/edit", anyOf: [{ resource: "terms", permission: "update" }] },
  { path: "/dashboard/reports", anyOf: [{ resource: "reports", permission: "read" }] },
  { path: "/dashboard/users", anyOf: [{ resource: "users", permission: "read" }] },
  { path: "/dashboard/holidays", anyOf: [{ resource: "holidays", permission: "read" }] },
  { path: "/dashboard/tariffs", anyOf: [{ resource: "tariffs", permission: "read" }] },
  { path: "/dashboard/tariffs/create", anyOf: [{ resource: "tariffs", permission: "create" }] },
  { path: "/dashboard/salary", anyOf: [{ resource: "salary", permission: "read-all" }] },
  {
    path: "/dashboard/my-salary",
    anyOf: [
      { resource: "salary", permission: "read-own" },
      { resource: "salary", permission: "read-all" },
    ],
  },
  { path: "/dashboard/settings/business/company", anyOf: [{ resource: "company", permission: "read" }] },
  { path: "/dashboard/settings/business/banks", anyOf: [{ resource: "bankAccounts", permission: "read" }] },
  { path: "/dashboard/settings", anyOf: [{ resource: "settings", permission: "read" }] },
];

function matchesOrganizationRoute(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split("/");
  const pathSegments = pathname.split("/");
  if (!pattern.includes(":")) {
    if (pattern === "/dashboard") return pathname === pattern;
    return pathname === pattern || pathname.startsWith(`${pattern}/`);
  }
  return patternSegments.length === pathSegments.length &&
    patternSegments.every((segment, index) =>
      segment.startsWith(":") || segment === pathSegments[index],
    );
}

export function getOrganizationRoutePermissions(
  pathname: string,
): readonly OrganizationRoutePermission[] | null {
  const route = organizationRoutePermissions
    .filter((candidate) => matchesOrganizationRoute(candidate.path, pathname))
    .sort((left, right) => {
      const leftStaticSegments = left.path.split("/").filter((part) => !part.startsWith(":")).length;
      const rightStaticSegments = right.path.split("/").filter((part) => !part.startsWith(":")).length;
      return rightStaticSegments - leftStaticSegments || right.path.length - left.path.length;
    })[0];
  return route?.anyOf ?? null;
}

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
    path: "/dashboard/leaves",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF]
  },
  {
    path: "/dashboard/issues",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },
  // Administrative configuration routes; the holiday calendar is intentionally staff-readable.
  {
    path: "/dashboard/services",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    path: "/dashboard/products",
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
  {
    path: "/dashboard/my-salary",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF],
  },

  {
    path: "/dashboard/settings/business/company",
    roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  // Other dashboard settings are not available to organization roles.
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
  if (userRole === UserRole.SUPER_ADMIN) return false;

  const route = routePermissions
    .filter((candidate) => pathname.startsWith(candidate.path))
    .sort((left, right) => right.path.length - left.path.length)[0];
  if (!route) return true;
  if (!route.roles.includes(userRole)) return false;

  const allowedDepartments = route.departmentRoles?.[userRole];
  if (allowedDepartments && !allowedDepartments.includes(department ?? "")) {
    return false;
  }

  return true;
}
