import { auth } from "@/lib/auth";
import { ActionError } from "@/lib/action-error";
import {
  canManageHolidays,
  isLeaveManager,
} from "@/lib/leave-permissions";
import { Department as DepartmentValues } from "@/app/generated/prisma/enums";
import type { Department } from "@/app/generated/prisma/enums";
import { hasWorkspaceAccess } from "@/lib/workspace-access";
import { headers } from "next/headers";

type Session = typeof auth.$Infer.Session;
export type LeaveUser = Session["user"];

export { canManageHolidays, isLeaveManager };

export function getHolidayDepartment(user: LeaveUser): Department | undefined {
  if (canManageHolidays(user)) return undefined;
  const department = Object.values(DepartmentValues).find(
    (value) => value === user.department,
  );
  if (!department) {
    throw new ActionError(
      "Your department is not configured for holiday access.",
      403,
    );
  }
  return department;
}

type LeaveSelfPermission = "create" | "read-own" | "cancel-own";
type LeaveManagerPermission = "read-all" | "review";
type HolidayManagerPermission = "create" | "update" | "delete";

async function hasLeavePermission(permission: LeaveSelfPermission | LeaveManagerPermission) {
  const result = await auth.api.userHasPermission({
    headers: await headers(),
    body: { permissions: { leave: [permission] } },
  });
  return result.success;
}

async function hasHolidayPermission(permission: "read" | HolidayManagerPermission) {
  const result = await auth.api.userHasPermission({
    headers: await headers(),
    body: { permissions: { holidays: [permission] } },
  });
  return result.success;
}

export async function requireLeaveUser(
  permission: LeaveSelfPermission = "read-own",
): Promise<LeaveUser> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    throw new ActionError("Sign in to access leave and holiday information.", 401);
  }

  const user = session.user;
  if (!hasWorkspaceAccess(user)) {
    throw new ActionError(
      "Ask your administrator or HR manager to assign you to a department before using this workspace.",
      403,
    );
  }
  if (!(await hasLeavePermission(permission))) {
    throw new ActionError("You do not have permission to access this leave operation.", 403);
  }

  return user;
}

export async function requireLeaveManager(
  permission: LeaveManagerPermission = "read-all",
): Promise<LeaveUser> {
  const user = await requireLeaveUser();
  if (!isLeaveManager(user)) {
    throw new ActionError("You do not have permission to manage leave requests.", 403);
  }
  if (
    user.role !== "STAFF" &&
    !(await hasLeavePermission(permission))
  ) {
    throw new ActionError("You do not have permission to manage leave requests.", 403);
  }
  return user;
}

export async function requireHolidayUser(): Promise<LeaveUser> {
  const user = await requireLeaveUser();
  if (!(await hasHolidayPermission("read"))) {
    throw new ActionError("You do not have permission to view company holidays.", 403);
  }
  return user;
}

export async function requireHolidayManager(
  permission: HolidayManagerPermission,
): Promise<LeaveUser> {
  const user = await requireHolidayUser();
  if (!canManageHolidays(user)) {
    throw new ActionError("Only HR staff and administrators can manage holidays.", 403);
  }
  if (
    user.role !== "STAFF" &&
    !(await hasHolidayPermission(permission))
  ) {
    throw new ActionError("You do not have permission to manage holidays.", 403);
  }
  return user;
}
