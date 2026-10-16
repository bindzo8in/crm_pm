import { Department, UserRole } from "@/app/generated/prisma/enums";
import type { WorkspaceActor } from "@/lib/workspace-access";

export function isLeaveManager(user: WorkspaceActor): boolean {
  return (
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.ADMIN ||
    (user.role === UserRole.STAFF && user.department === Department.HR)
  );
}

export function canManageHolidays(user: WorkspaceActor): boolean {
  return isLeaveManager(user);
}
