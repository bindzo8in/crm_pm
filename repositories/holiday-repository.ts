import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";

export type HolidayWriteData = {
  name: string;
  date: Date;
  description: string | null;
};

export function listHolidays(startDate: Date, endDate: Date) {
  return prisma.holiday.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: "asc" },
  });
}

export function listUpcomingHolidays(today: Date) {
  return prisma.holiday.findMany({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
    take: 10,
  });
}

export function createHoliday(data: HolidayWriteData) {
  return prisma.holiday.create({ data });
}

export function updateHoliday(id: string, data: HolidayWriteData) {
  return prisma.holiday.update({ where: { id }, data });
}

export function deleteHoliday(id: string) {
  return prisma.holiday.delete({ where: { id } });
}

export function isUniqueHolidayDateConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
