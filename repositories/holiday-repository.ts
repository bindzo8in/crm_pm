import { randomUUID } from "node:crypto";
import { UserRole } from "@/app/generated/prisma/enums";
import type { Department, HolidayCategory } from "@/app/generated/prisma/enums";
import { Prisma } from "@/app/generated/prisma/client";
import { formatHolidayDateRange, formatHolidayDepartmentScope, HOLIDAY_CATEGORY_LABELS } from "@/lib/holiday-format";
import prisma from "@/lib/prisma";

export type HolidayWriteData = {
  name: string;
  startDate: Date;
  endDate: Date;
  category: HolidayCategory;
  departments: Department[];
  notifyStaff: boolean;
  description: string | null;
};

type HolidayRecipient = { id: string; email: string };

type HolidayMutationResult = {
  holidays: Awaited<ReturnType<typeof prisma.holiday.findMany>>;
  notificationCount: number;
  recipients: HolidayRecipient[];
};

function getEventDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  for (
    let timestamp = startDate.getTime();
    timestamp <= endDate.getTime();
    timestamp += 86_400_000
  ) {
    dates.push(new Date(timestamp));
  }
  return dates;
}

async function findHolidayAudience(
  transaction: Prisma.TransactionClient,
  departments: Department[],
): Promise<HolidayRecipient[]> {
  const where: Prisma.UserWhereInput = {
    role: UserRole.STAFF,
    AND: [
      { OR: [{ banned: false }, { banned: null }] },
      ...(departments.length ? [{ department: { in: departments } }] : []),
    ],
  };
  return transaction.user.findMany({
    where,
    select: { id: true, email: true },
  });
}

async function createStaffNotifications(
  transaction: Prisma.TransactionClient,
  recipients: HolidayRecipient[],
  data: HolidayWriteData,
  action: "added" | "updated",
): Promise<void> {
  if (recipients.length === 0) return;

  const dateLabel = formatHolidayDateRange(data.startDate, data.endDate);
  const departmentLabel = formatHolidayDepartmentScope(data.departments);
  const categoryLabel = HOLIDAY_CATEGORY_LABELS[data.category];
  await transaction.notification.createMany({
    data: recipients.map(({ id }) => ({
      userId: id,
      type: "HOLIDAY",
      title: `Holiday ${action}: ${data.name}`,
      message: `${dateLabel} · ${categoryLabel} · ${departmentLabel}`,
      href: "/dashboard/holidays",
    })),
  });
}

function holidayRowsData(data: HolidayWriteData, eventId: string) {
  return getEventDates(data.startDate, data.endDate).map((date) => ({
    eventId,
    name: data.name,
    date,
    category: data.category,
    departments: data.departments,
    notifyStaff: data.notifyStaff,
    description: data.description,
  }));
}

export function listHolidays(
  startDate: Date,
  endDate: Date,
  department?: Department,
) {
  const where: Prisma.HolidayWhereInput = {
    date: { gte: startDate, lte: endDate },
    ...(department
      ? {
          OR: [
            { departments: { isEmpty: true } },
            { departments: { has: department } },
          ],
        }
      : {}),
  };
  return prisma.holiday.findMany({
    where,
    orderBy: { date: "asc" },
  }).then(async (yearRows) => {
    const eventIds = yearRows
      .map(({ eventId }) => eventId)
      .filter((eventId): eventId is string => eventId !== null);
    if (eventIds.length === 0) return yearRows;

    const eventRows = await prisma.holiday.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { date: "asc" },
    });
    return [
      ...yearRows.filter(({ eventId }) => eventId === null),
      ...eventRows,
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  });
}

export function listUpcomingHolidays(today: Date, department?: Department) {
  return prisma.holiday.findMany({
    where: {
      date: { gte: today },
      ...(department
        ? {
            OR: [
              { departments: { isEmpty: true } },
              { departments: { has: department } },
            ],
          }
        : {}),
    },
    orderBy: { date: "asc" },
    take: 10,
  });
}

export function createHolidayEvent(
  data: HolidayWriteData,
): Promise<HolidayMutationResult> {
  return prisma.$transaction(async (transaction) => {
    const eventId = randomUUID();
    await transaction.holiday.createMany({
      data: holidayRowsData(data, eventId),
    });
    const holidays = await transaction.holiday.findMany({
      where: { eventId },
      orderBy: { date: "asc" },
    });

    const recipients = data.notifyStaff
      ? await findHolidayAudience(transaction, data.departments)
      : [];
    if (data.notifyStaff) {
      await createStaffNotifications(transaction, recipients, data, "added");
    }

    return {
      holidays,
      notificationCount: recipients.length,
      recipients,
    };
  });
}

export function updateHolidayEvent(
  id: string,
  data: HolidayWriteData,
): Promise<HolidayMutationResult> {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.holiday.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Holiday not found.");
    }

    const oldEventWhere = existing.eventId
      ? { eventId: existing.eventId }
      : { id: existing.id };
    const eventId = existing.eventId ?? randomUUID();
    const oldRecipients = data.notifyStaff
      ? await findHolidayAudience(transaction, existing.departments)
      : [];
    await transaction.holiday.deleteMany({ where: oldEventWhere });
    await transaction.holiday.createMany({
      data: holidayRowsData(data, eventId),
    });

    const newRecipients = data.notifyStaff
      ? await findHolidayAudience(transaction, data.departments)
      : [];
    const recipients = [
      ...new Map(
        [...oldRecipients, ...newRecipients].map((recipient) => [
          recipient.id,
          recipient,
        ]),
      ).values(),
    ];
    if (data.notifyStaff) {
      await createStaffNotifications(transaction, recipients, data, "updated");
    }

    const holidays = await transaction.holiday.findMany({
      where: { eventId },
      orderBy: { date: "asc" },
    });
    return {
      holidays,
      notificationCount: recipients.length,
      recipients,
    };
  });
}

export function deleteHolidayEvent(id: string) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.holiday.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Holiday not found.");
    }
    return transaction.holiday.deleteMany({
      where: existing.eventId
        ? { eventId: existing.eventId }
        : { id: existing.id },
    });
  });
}

export function isUniqueHolidayDateConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
