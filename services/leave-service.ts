import { LeaveStatus, LeaveType } from "@/app/generated/prisma/enums";
import { ActionError } from "@/lib/action-error";
import {
  calculateLeaveDayBreakdown,
  calculateHalfDayLeaveBreakdown,
  countAnnualLeaveDaysInMonth,
  getAnnualLeaveMonthOverLimit,
  toDateKey,
} from "@/lib/leave-policy";
import { DEFAULT_WEEKEND_DAYS } from "@/lib/weekend-policy";
import {
  approveOrRejectPendingRequest,
  cancelOwnPendingRequest,
  findApprovedAnnualBreakdowns,
  findLeaveNotificationRecipients,
  findHolidayDates,
  findOverlappingActiveRequests,
  findLeaveRequestForReview,
  getApprovedAnnualBreakdownsForMonth,
  getManagerLeaveSummary,
  insertLeaveRequest,
  createLeaveNotifications,
  listManagerLeaveRequests,
  listOwnLeaveRequests,
  withLeaveTransaction,
} from "@/repositories/leave-repository";
import { sendLeavePushNotification } from "@/services/leave-notification-service";
import { sendLeaveNotificationEmail } from "@/lib/email";
import { broadcastNotificationUpdates } from "@/lib/notification-realtime";

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

function formatLeaveDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getLeaveDateRange(startDate: Date, endDate: Date): string {
  return `${formatLeaveDate(startDate)} to ${formatLeaveDate(endDate)}`;
}

async function dispatchLeavePush(
  userIds: string[],
  title: string,
  message: string,
) {
  try {
    await sendLeavePushNotification(userIds, title, message);
  } catch (error: unknown) {
    console.error("Unable to deliver leave notification push.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

async function dispatchLeaveEmail(
  recipients: Array<{ email: string; name: string }>,
  subject: string,
  message: string,
  actionLabel: string,
) {
  await Promise.all(
    recipients.map(async ({ email, name }) => {
      try {
        await sendLeaveNotificationEmail({
          email,
          name,
          subject,
          message,
          actionLabel,
        });
      } catch (error: unknown) {
        console.error("Unable to deliver leave notification email.", {
          email,
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }),
  );
}

export async function createLeaveRequest(input: {
  userId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  halfDayPeriod: "MORNING" | "AFTERNOON" | null;
  reason: string;
}) {
  const { leave, recipients } = await runWithConflictMessage(() =>
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
      const attendanceSettings = await transaction.attendanceSettings.findFirst({
        select: { weekendDays: true },
      });
      const breakdown = calculateLeaveDayBreakdown(
        input.startDate,
        input.endDate,
        new Map(holidayDates.map(({ date, isHalfDay }) => [
          toDateKey(date),
          isHalfDay ? 0.5 : 1,
        ])),
        new Set(attendanceSettings?.weekendDays ?? DEFAULT_WEEKEND_DAYS),
      );
      const requestBreakdown = input.isHalfDay
        ? calculateHalfDayLeaveBreakdown(breakdown, input.startDate)
        : breakdown;
      const { monthlyBreakdown, ...savedBreakdown } = requestBreakdown;

      const leave = await insertLeaveRequest(transaction, {
        ...input,
        ...savedBreakdown,
        monthlyDayBreakdown: monthlyBreakdown,
      });
      const recipients = await findLeaveNotificationRecipients(transaction, input.userId);
      const title = "Leave request needs review";
      const message = `${leave.user.name} requested ${leave.type.toLowerCase()} leave for ${getLeaveDateRange(leave.startDate, leave.endDate)}${leave.isHalfDay ? ` (${leave.halfDayPeriod?.toLowerCase()} half)` : ""}.`;
      await createLeaveNotifications(
        transaction,
        recipients.map(({ id }) => ({
          userId: id,
          type: "LEAVE_REQUEST",
          title,
          message,
          href: "/dashboard/leaves",
        })),
      );
      return { leave, recipients };
    }),
  );

  await broadcastNotificationUpdates(recipients.map(({ id }) => id));
  const title = "Leave request needs review";
  const message = `${leave.user.name} requested ${leave.type.toLowerCase()} leave for ${getLeaveDateRange(leave.startDate, leave.endDate)}${leave.isHalfDay ? ` (${leave.halfDayPeriod?.toLowerCase()} half)` : ""}.`;
  await dispatchLeavePush(recipients.map(({ id }) => id), title, message);
  await dispatchLeaveEmail(recipients, title, message, "Review leave request");
  return leave;
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
  const leave = await runWithConflictMessage(() =>
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

      const reviewedLeave = await approveOrRejectPendingRequest(
        transaction,
        input.id,
        input.status,
        input.managerComment,
      );
      const title = input.status === LeaveStatus.APPROVED
        ? "Leave request approved"
        : "Leave request rejected";
      const decision = input.status === LeaveStatus.APPROVED ? "approved" : "rejected";
      const dateRange = getLeaveDateRange(reviewedLeave.startDate, reviewedLeave.endDate);
      const halfDayDetail = reviewedLeave.isHalfDay
        ? ` (${reviewedLeave.halfDayPeriod?.toLowerCase()} half-day)`
        : "";
      const comment = input.managerComment
        ? ` Reviewer comment: ${input.managerComment}`
        : "";
      const message = `Your ${reviewedLeave.type.toLowerCase()} leave for ${dateRange}${halfDayDetail} was ${decision}.${comment}`;
      await createLeaveNotifications(transaction, [{
        userId: reviewedLeave.userId,
        type: `LEAVE_${input.status}`,
        title,
        message,
        href: "/dashboard/leaves",
      }]);
      return reviewedLeave;
    }),
  );

  await broadcastNotificationUpdates([leave.userId]);
  const title = input.status === LeaveStatus.APPROVED
    ? "Leave request approved"
    : "Leave request rejected";
  const decision = input.status === LeaveStatus.APPROVED ? "approved" : "rejected";
  const dateRange = getLeaveDateRange(leave.startDate, leave.endDate);
  const halfDayDetail = leave.isHalfDay
    ? ` (${leave.halfDayPeriod?.toLowerCase()} half-day)`
    : "";
  const comment = input.managerComment
    ? ` Reviewer comment: ${input.managerComment}`
    : "";
  const message = `Your ${leave.type.toLowerCase()} leave for ${dateRange}${halfDayDetail} was ${decision}.${comment}`;
  await dispatchLeavePush([leave.userId], title, message);
  await dispatchLeaveEmail(
    [{ email: leave.user.email, name: leave.user.name }],
    title,
    message,
    "View leave request",
  );
  return leave;
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
