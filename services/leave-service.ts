import { LeaveStatus, LeaveType } from "@/app/generated/prisma/enums";
import { ActionError } from "@/lib/action-error";
import {
  calculateLeaveDayBreakdown,
  countAnnualLeaveDaysInMonth,
  getAnnualLeaveMonthOverLimit,
  toDateKey,
} from "@/lib/leave-policy";
import {
  approveOrRejectPendingRequest,
  cancelOwnPendingRequest,
  findApprovedAnnualBreakdowns,
  findHolidayDates,
  findOverlappingActiveRequests,
  findLeaveRequestForReview,
  getApprovedAnnualBreakdownsForMonth,
  getManagerLeaveSummary,
  insertLeaveRequest,
  listManagerLeaveRequests,
  listOwnLeaveRequests,
  withLeaveTransaction,
} from "@/repositories/leave-repository";

function isTransactionConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

async function runWithConflictMessage<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isTransactionConflict(error)) {
      throw new ActionError(
        "This request changed at the same time as another update. Refresh and try again.",
        409,
      );
    }
    throw error;
  }
}

export async function createLeaveRequest(input: {
  userId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
}) {
  return runWithConflictMessage(() =>
    withLeaveTransaction(async (transaction) => {
      const overlapping = await findOverlappingActiveRequests(
        transaction,
        input.userId,
        input.startDate,
        input.endDate,
      );
      if (overlapping) {
        throw new ActionError(
          "This date range overlaps a pending or approved leave request.",
          409,
        );
      }

      const holidayDates = await findHolidayDates(
        transaction,
        input.userId,
        input.startDate,
        input.endDate,
      );
      const breakdown = calculateLeaveDayBreakdown(
        input.startDate,
        input.endDate,
        new Set(holidayDates.map(toDateKey)),
      );
      const { monthlyBreakdown, ...savedBreakdown } = breakdown;

      return insertLeaveRequest(transaction, {
        ...input,
        ...savedBreakdown,
        monthlyDayBreakdown: monthlyBreakdown,
      });
    }),
  );
}

export function getOwnLeaveRequests(
  userId: string,
  page: number,
  pageSize: number,
  filters?: Parameters<typeof listOwnLeaveRequests>[3],
) {
  return listOwnLeaveRequests(userId, page, pageSize, filters);
}

export function getManagerLeaveRequests(filters: Parameters<typeof listManagerLeaveRequests>[0]) {
  return listManagerLeaveRequests(filters);
}

export function getLeaveManagementSummary(today: Date) {
  return getManagerLeaveSummary(today);
}

export async function cancelPendingLeaveRequest(userId: string, id: string) {
  const result = await cancelOwnPendingRequest(userId, id);
  if (result.count !== 1) {
    throw new ActionError("Only your own pending leave requests can be cancelled.", 409);
  }
}

export async function reviewLeaveRequest(input: {
  approverId: string;
  id: string;
  status: typeof LeaveStatus.APPROVED | typeof LeaveStatus.REJECTED;
  managerComment: string | null;
}) {
  return runWithConflictMessage(() =>
    withLeaveTransaction(async (transaction) => {
      const leave = await findLeaveRequestForReview(transaction, input.id);
      if (!leave) {
        throw new ActionError("Leave request not found.", 404);
      }
      if (leave.status !== LeaveStatus.PENDING) {
        throw new ActionError("Only pending leave requests can be reviewed.", 409);
      }
      if (leave.userId === input.approverId) {
        throw new ActionError("You cannot review your own leave request.", 403);
      }

      if (input.status === LeaveStatus.APPROVED && leave.type === LeaveType.ANNUAL) {
        const firstMonthStart = new Date(Date.UTC(
          leave.startDate.getUTCFullYear(),
          leave.startDate.getUTCMonth(),
          1,
        ));
        const finalMonthEnd = new Date(Date.UTC(
          leave.endDate.getUTCFullYear(),
          leave.endDate.getUTCMonth() + 1,
          0,
        ));
        const priorApproved = await findApprovedAnnualBreakdowns(
          transaction,
          leave.userId,
          firstMonthStart,
          finalMonthEnd,
        );
        const monthOverLimit = getAnnualLeaveMonthOverLimit(
          priorApproved.map(({ monthlyDayBreakdown }) => monthlyDayBreakdown),
          leave.monthlyDayBreakdown,
        );
        if (monthOverLimit) {
          throw new ActionError(
            `Approval would exceed the one paid Annual Leave day available in ${monthOverLimit}.`,
            409,
          );
        }
      }

      return approveOrRejectPendingRequest(
        transaction,
        input.id,
        input.status,
        input.managerComment,
      );
    }),
  );
}

export async function getAnnualLeaveBalance(userId: string, month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNumber, 0));
  const requests = await getApprovedAnnualBreakdownsForMonth(
    userId,
    startDate,
    endDate,
  );
  const approvedDays = countAnnualLeaveDaysInMonth(
    requests.map(({ monthlyDayBreakdown }) => monthlyDayBreakdown),
    month,
  );
  return { month, entitledDays: 1, approvedDays, remainingDays: Math.max(0, 1 - approvedDays) };
}
