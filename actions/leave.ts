"use server";

import { LeaveStatus, LeaveType, Department } from "@/app/generated/prisma/enums";
import { ActionError } from "@/lib/action-error";
import { requireLeaveManager, requireLeaveUser } from "@/lib/leave-access";
import { parseDateOnly } from "@/lib/leave-policy";
import { formatInIST, getAttendanceDate } from "@/lib/date";
import {
  cancelPendingLeaveRequest,
  createLeaveRequest,
  getAnnualLeaveBalance,
  getLeaveManagementSummary,
  getManagerLeaveRequests,
  getOwnLeaveRequests,
  reviewLeaveRequest,
} from "@/services/leave-service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => {
    try {
      parseDateOnly(value);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid date.")
  .transform(parseDateOnly);

const leaveRequestSchema = z
  .object({
    type: z.enum(LeaveType),
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    reason: z.string().trim().min(1, "Reason is required.").max(500),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date cannot be before start date.",
  })
  .refine((value) => value.startDate >= parseDateOnly(getAttendanceDate()), {
    path: ["startDate"],
    message: "Start date cannot be before today.",
  });

const paginationSchema = z.object({
  page: z.coerce.number().int().min(0).max(100_000).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const ownLeaveFilterSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  type: z.enum(LeaveType).optional(),
  status: z.enum(LeaveStatus).optional(),
});

const managerFilterSchema = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
  type: z.enum(LeaveType).optional(),
  status: z.enum(LeaveStatus).optional(),
  department: z.enum(Department).optional(),
  fromDate: dateOnlySchema.optional(),
  throughDate: dateOnlySchema.optional(),
});

const updateLeaveStatusSchema = z.object({
  id: z.string().trim().min(1).max(100),
  status: z.enum([LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
  managerComment: z.string().trim().max(1000).optional(),
});

const requestIdSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

const balanceSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Enter a valid calendar month.")
    .optional(),
});

export async function submitLeaveRequestAction(input: unknown) {
  const user = await requireLeaveUser("create");
  const parsed = leaveRequestSchema.parse(input);
  const leave = await createLeaveRequest({ userId: user.id, ...parsed });

  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true, leave };
}

export async function getMyLeaveRequestsAction(input: unknown = {}) {
  const user = await requireLeaveUser();
  const parsed = ownLeaveFilterSchema.parse(input);
  const result = await getOwnLeaveRequests(user.id, parsed.page, parsed.pageSize, {
    search: parsed.search,
    type: parsed.type,
    status: parsed.status,
  });
  return { success: true, ...result, page: parsed.page, pageSize: parsed.pageSize };
}

export async function getAllLeaveRequestsAction(input: unknown = {}) {
  await requireLeaveManager("read-all");
  const parsed = managerFilterSchema.parse(input);
  if (parsed.fromDate && parsed.throughDate && parsed.fromDate > parsed.throughDate) {
    throw new ActionError("The start of the filter range must be before its end.", 400);
  }

  const result = await getManagerLeaveRequests(parsed);
  return { success: true, ...result, page: parsed.page, pageSize: parsed.pageSize };
}

export async function getLeaveManagementSummaryAction() {
  await requireLeaveManager("read-all");
  return {
    success: true,
    ...(await getLeaveManagementSummary(parseDateOnly(getAttendanceDate()))),
  };
}

export async function cancelLeaveRequestAction(input: unknown) {
  const user = await requireLeaveUser("cancel-own");
  const { id } = requestIdSchema.parse(input);
  await cancelPendingLeaveRequest(user.id, id);

  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateLeaveStatusAction(input: unknown) {
  const user = await requireLeaveManager("review");
  const parsed = updateLeaveStatusSchema.parse(input);
  const leave = await reviewLeaveRequest({
    approverId: user.id,
    id: parsed.id,
    status: parsed.status,
    managerComment: parsed.managerComment || null,
  });

  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true, leave };
}

export async function getAnnualLeaveBalanceAction(input: unknown = {}) {
  const user = await requireLeaveUser();
  const parsed = balanceSchema.parse(input);
  const month = parsed.month ?? formatInIST(new Date(), "yyyy-MM");
  return { success: true, ...(await getAnnualLeaveBalance(user.id, month)) };
}
