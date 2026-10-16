import { Department, LeaveStatus, LeaveType } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

export type LeaveTransaction = Prisma.TransactionClient;

export type LeaveRequestCreateData = {
  userId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  totalDays: number;
  netLeaveDays: number;
  sundayCount: number;
  holidayCount: number;
  monthlyDayBreakdown: Prisma.InputJsonValue;
};

export type ManagerLeaveFilters = {
  page: number;
  pageSize: number;
  search?: string;
  type?: LeaveType;
  status?: LeaveStatus;
  department?: Department;
  fromDate?: Date;
  throughDate?: Date;
};

export type ManagerLeaveRequestRecord = Prisma.LeaveRequestGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        department: true;
        role: true;
      };
    };
  };
}>;

export async function withLeaveTransaction<T>(
  callback: (transaction: LeaveTransaction) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(callback, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function findOverlappingActiveRequests(
  transaction: LeaveTransaction,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return transaction.leaveRequest.findFirst({
    where: {
      userId,
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true },
  });
}

export async function findHolidayDates(
  transaction: LeaveTransaction,
  startDate: Date,
  endDate: Date,
): Promise<Date[]> {
  const holidays = await transaction.holiday.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    select: { date: true },
  });
  return holidays.map(({ date }) => date);
}

export function insertLeaveRequest(
  transaction: LeaveTransaction,
  data: LeaveRequestCreateData,
) {
  return transaction.leaveRequest.create({ data });
}

export async function listOwnLeaveRequests(
  userId: string,
  page: number,
  pageSize: number,
) {
  const where = { userId };
  const [leaves, totalCount] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * pageSize,
      take: pageSize,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { leaves, totalCount };
}

export async function listManagerLeaveRequests(
  filters: ManagerLeaveFilters,
): Promise<{ leaves: ManagerLeaveRequestRecord[]; totalCount: number }> {
  const where: Prisma.LeaveRequestWhereInput = {
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.fromDate || filters.throughDate
      ? {
          startDate: filters.throughDate ? { lte: filters.throughDate } : undefined,
          endDate: filters.fromDate ? { gte: filters.fromDate } : undefined,
        }
      : {}),
    ...(filters.search
      ? {
          user: {
            ...(filters.department ? { department: filters.department } : {}),
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
    ...(!filters.search && filters.department
      ? { user: { department: filters.department } }
      : {}),
  };

  const [leaves, totalCount] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, department: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: filters.page * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { leaves, totalCount };
}

export function cancelOwnPendingRequest(userId: string, id: string) {
  return prisma.leaveRequest.updateMany({
    where: { id, userId, status: LeaveStatus.PENDING },
    data: { status: LeaveStatus.CANCELLED },
  });
}

export function findLeaveRequestForReview(
  transaction: LeaveTransaction,
  id: string,
) {
  return transaction.leaveRequest.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      monthlyDayBreakdown: true,
    },
  });
}

export function findApprovedAnnualBreakdowns(
  transaction: LeaveTransaction,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return transaction.leaveRequest.findMany({
    where: {
      userId,
      type: LeaveType.ANNUAL,
      status: LeaveStatus.APPROVED,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { monthlyDayBreakdown: true },
  });
}

export function approveOrRejectPendingRequest(
  transaction: LeaveTransaction,
  id: string,
  status: typeof LeaveStatus.APPROVED | typeof LeaveStatus.REJECTED,
  managerComment: string | null,
) {
  return transaction.leaveRequest.update({
    where: { id },
    data: { status, managerComment },
    include: {
      user: {
        select: { id: true, name: true, email: true, department: true, role: true },
      },
    },
  });
}

export async function getApprovedAnnualBreakdownsForMonth(
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return prisma.leaveRequest.findMany({
    where: {
      userId,
      type: LeaveType.ANNUAL,
      status: LeaveStatus.APPROVED,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { monthlyDayBreakdown: true },
  });
}
