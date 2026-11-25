import {
  Department,
  EmploymentStatus,
  LeaveStatus,
  LeaveType,
  UserRole,
} from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { departmentMembershipWhere, getDepartmentMemberships } from "@/lib/departments";

export type LeaveTransaction = Prisma.TransactionClient;

export type LeaveNotificationRecipient = {
  id: string;
  name: string;
  email: string;
};

export type LeaveRequestCreateData = {
  organizationId: string;
  userId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  isHalfDay: boolean;
  halfDayPeriod: "MORNING" | "AFTERNOON" | null;
  reason: string;
  totalDays: number;
  netLeaveDays: number;
  sundayCount: number;
  weekendCount: number;
  holidayCount: number;
  monthlyDayBreakdown: Prisma.InputJsonValue;
};

export type ManagerLeaveFilters = {
  organizationId: string;
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
        additionalDepartments: true;
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
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return transaction.leaveRequest.findFirst({
    where: {
      organizationId,
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
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<Array<{ date: Date; isHalfDay: boolean }>> {
  const user = await transaction.user.findFirst({
    where: {
      id: userId,
      organizationMemberships: { some: { organizationId } },
    },
    select: { department: true, additionalDepartments: true },
  });
  if (!user) return [];
  const departments = getDepartmentMemberships(user);
  if (departments.length === 0) return [];

  const holidays = await transaction.holiday.findMany({
    where: {
      organizationId,
      date: { gte: startDate, lte: endDate },
      OR: [
        { departments: { isEmpty: true } },
        { departments: { hasSome: departments } },
      ],
    },
    select: { date: true, isHalfDay: true },
  });
  return holidays;
}

export function insertLeaveRequest(
  transaction: LeaveTransaction,
  data: LeaveRequestCreateData,
) {
  return transaction.leaveRequest.create({
    data,
    include: { user: { select: { name: true, email: true } } },
  });
}

export function findLeaveNotificationRecipients(
  transaction: LeaveTransaction,
  organizationId: string,
  excludeUserId: string,
): Promise<LeaveNotificationRecipient[]> {
  return transaction.user.findMany({
    where: {
      id: { not: excludeUserId },
      employmentStatus: EmploymentStatus.ACTIVE,
      organizationMemberships: { some: { organizationId } },
      OR: [
        { role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN] } },
        { department: Department.HR },
      ],
      AND: [{ OR: [{ banned: false }, { banned: null }] }],
    },
    select: { id: true, name: true, email: true },
  });
}

export function createLeaveNotifications(
  transaction: LeaveTransaction,
  data: Prisma.NotificationCreateManyInput[],
) {
  if (data.length === 0) return Promise.resolve({ count: 0 });
  return transaction.notification.createMany({ data });
}

export function listWebPushSubscriptionsForUsers(userIds: string[]) {
  if (userIds.length === 0) return Promise.resolve([]);
  return prisma.webPushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: {
      id: true,
      userId: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });
}

export function deleteWebPushSubscription(id: string) {
  return prisma.webPushSubscription.deleteMany({ where: { id } });
}

export async function listOwnLeaveRequests(
  organizationId: string,
  userId: string,
  page: number,
  pageSize: number,
  filters: { search?: string; type?: LeaveType; status?: LeaveStatus } = {},
) {
  const where: Prisma.LeaveRequestWhereInput = {
    organizationId,
    userId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? { reason: { contains: filters.search, mode: "insensitive" } }
      : {}),
  };
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
    organizationId: filters.organizationId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.fromDate || filters.throughDate
      ? {
          startDate: filters.throughDate ? { lte: filters.throughDate } : undefined,
          endDate: filters.fromDate ? { gte: filters.fromDate } : undefined,
        }
      : {}),
    ...(filters.search || filters.department
      ? {
          user: {
            ...(filters.search
              ? {
                  OR: [
                    { name: { contains: filters.search, mode: "insensitive" as const } },
                    { email: { contains: filters.search, mode: "insensitive" as const } },
                  ],
                }
              : {}),
            ...(filters.department
              ? { AND: [departmentMembershipWhere(filters.department)] }
              : {}),
          },
        }
      : {}),
  };

  const [leaves, totalCount] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            additionalDepartments: true,
            role: true,
          },
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

export async function getManagerLeaveSummary(today: Date, organizationId: string) {
  const [statusCounts, employeesOnLeave] = await Promise.all([
    prisma.leaveRequest.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        organizationId,
        status: LeaveStatus.APPROVED,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);
  const countForStatus = (status: LeaveStatus) =>
    statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;

  return {
    pendingCount: countForStatus(LeaveStatus.PENDING),
    approvedCount: countForStatus(LeaveStatus.APPROVED),
    rejectedCount: countForStatus(LeaveStatus.REJECTED),
    totalCount: statusCounts.reduce((total, entry) => total + entry._count._all, 0),
    onLeaveTodayCount: employeesOnLeave.length,
  };
}

export function cancelOwnPendingRequest(organizationId: string, userId: string, id: string) {
  return prisma.leaveRequest.updateMany({
    where: { id, organizationId, userId, status: LeaveStatus.PENDING },
    data: { status: LeaveStatus.CANCELLED },
  });
}

export function findLeaveRequestForReview(
  transaction: LeaveTransaction,
  id: string,
  organizationId: string,
) {
  return transaction.leaveRequest.findFirst({
    where: { id, organizationId },
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
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return transaction.leaveRequest.findMany({
    where: {
      organizationId,
      userId,
      type: LeaveType.ANNUAL,
      status: LeaveStatus.APPROVED,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { monthlyDayBreakdown: true },
  });
}

export async function approveOrRejectPendingRequest(
  transaction: LeaveTransaction,
  id: string,
  organizationId: string,
  status: typeof LeaveStatus.APPROVED | typeof LeaveStatus.REJECTED,
  managerComment: string | null,
) {
  const result = await transaction.leaveRequest.updateMany({
    where: { id, organizationId, status: LeaveStatus.PENDING },
    data: { status, managerComment },
  });
  if (result.count !== 1) return null;

  return transaction.leaveRequest.findFirst({
    where: { id, organizationId, status },
    select: {
      id: true,
      userId: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      isHalfDay: true,
      halfDayPeriod: true,
      user: { select: { name: true, email: true } },
    },
  });
}

export async function getApprovedAnnualBreakdownsForMonth(
  organizationId: string,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return prisma.leaveRequest.findMany({
    where: {
      organizationId,
      userId,
      type: LeaveType.ANNUAL,
      status: LeaveStatus.APPROVED,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { monthlyDayBreakdown: true },
  });
}
