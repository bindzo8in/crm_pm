import {
  checkOrganizationPermission,
  getActiveOrganizationId,
} from "@/lib/organization-authorization";
import { auth } from "@/lib/auth";
import { ActionError } from "@/lib/action-error";
import { headers } from "next/headers";

type Session = typeof auth.$Infer.Session;
export type LeaveUser = Session["user"];
export type LeaveOrganizationUser = LeaveUser & { organizationId: string };

type LeaveSelfPermission = "create" | "read-own" | "cancel-own";
type LeaveManagerPermission = "read-all" | "review";
type HolidayManagerPermission = "create" | "update" | "delete";

async function hasLeavePermission(permission: LeaveSelfPermission | LeaveManagerPermission) {
  const result = await checkOrganizationPermission({
    headers: await headers(),
    body: { permissions: { leave: [permission] } },
  });
  return result.success;
}

async function hasHolidayPermission(permission: "read" | HolidayManagerPermission) {
  const result = await checkOrganizationPermission({
    headers: await headers(),
    body: { permissions: { holidays: [permission] } },
  });
  return result.success;
}

export async function isLeaveManager(): Promise<boolean> {
  const [canReadAll, canReview] = await Promise.all([
    hasLeavePermission("read-all"),
    hasLeavePermission("review"),
  ]);
  return canReadAll && canReview;
}

export async function canManageHolidays(): Promise<boolean> {
  const permissions = await Promise.all([
    hasHolidayPermission("create"),
    hasHolidayPermission("update"),
    hasHolidayPermission("delete"),
  ]);
  return permissions.every(Boolean);
}

async function requireSignedInUser(): Promise<LeaveOrganizationUser> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) {
    throw new ActionError("Sign in to access leave and holiday information.", 401);
  }
  const organizationId = await getActiveOrganizationId(requestHeaders);
  if (!organizationId) {
    throw new ActionError("Choose an organization to access leave and holiday information.", 403);
  }
  return { ...session.user, organizationId };
}

export async function requireLeaveUser(
  permission: LeaveSelfPermission = "read-own",
): Promise<LeaveOrganizationUser> {
  const user = await requireSignedInUser();
  if (!(await hasLeavePermission(permission))) {
    throw new ActionError("You do not have permission to access this leave operation.", 403);
  }

  return user;
}

export async function requireLeaveManager(
  permission: LeaveManagerPermission = "read-all",
): Promise<LeaveOrganizationUser> {
  const user = await requireSignedInUser();
  if (!(await hasLeavePermission(permission))) {
    throw new ActionError("You do not have permission to manage leave requests.", 403);
  }
  return user;
}

export async function requireHolidayUser(): Promise<LeaveOrganizationUser> {
  const user = await requireSignedInUser();
  if (!(await hasHolidayPermission("read"))) {
    throw new ActionError("You do not have permission to view company holidays.", 403);
  }
  return user;
}

export async function requireHolidayManager(
  permission: HolidayManagerPermission,
): Promise<LeaveOrganizationUser> {
  const user = await requireSignedInUser();
  if (!(await hasHolidayPermission(permission))) {
    throw new ActionError("You do not have permission to manage holidays.", 403);
  }
  return user;
}
