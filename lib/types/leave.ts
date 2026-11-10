import type { LeaveType, Prisma } from "@/app/generated/prisma/client";
import { LeaveStatus as LeaveStatusValue } from "@/app/generated/prisma/enums";

export type LeaveRequestRow = Pick<
  Prisma.LeaveRequestGetPayload<object>,
  | "id"
  | "userId"
  | "type"
  | "startDate"
  | "endDate"
  | "reason"
  | "status"
  | "managerComment"
  | "isHalfDay"
  | "halfDayPeriod"
  | "totalDays"
  | "netLeaveDays"
  | "sundayCount"
  | "weekendCount"
  | "holidayCount"
  | "monthlyDayBreakdown"
  | "createdAt"
  | "updatedAt"
>;

export type ManagerLeaveRequestRow = Prisma.LeaveRequestGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        department: true;
        additionalDepartments: true;
        role: true;
      };
    };
  };
}>;

export type LeaveFormValues = {
  type: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod: "MORNING" | "AFTERNOON" | null;
  reason: string;
};

export type LeaveReviewValues = {
  id: string;
  status: typeof LeaveStatusValue.APPROVED | typeof LeaveStatusValue.REJECTED;
  managerComment?: string;
};
