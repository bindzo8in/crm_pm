import { Department, UserRole } from "@/app/generated/prisma/enums";

export type WorkspaceActor = {
  role?: UserRole | string | null;
  department?: Department | string | null;
};

export const BUSINESS_WORKSPACE_DEPARTMENTS = [Department.HR, Department.SALES] as const;

export function hasWorkspaceAccess(user: WorkspaceActor): boolean {
  if (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN
  ) {
    return true;
  }
  return (
    user.role === UserRole.STAFF &&
    Object.values(Department).some((department) => department === user.department)
  );
}

export function hasBusinessWorkspaceAccess(user: WorkspaceActor): boolean {
  if (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN
  ) {
    return true;
  }

  return (
    user.role === UserRole.STAFF &&
    BUSINESS_WORKSPACE_DEPARTMENTS.some((department) => department === user.department)
  );
}
