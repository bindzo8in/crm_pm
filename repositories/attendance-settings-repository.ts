import prisma from "@/lib/prisma";
import { DEFAULT_WEEKEND_DAYS } from "@/lib/weekend-policy";

export async function getWeekendDays(organizationId: string) {
  const settings = await prisma.attendanceSettings.findUnique({
    where: { organizationId },
    select: { weekendDays: true },
  });
  return settings?.weekendDays ?? [...DEFAULT_WEEKEND_DAYS];
}

export function saveWeekendDays(organizationId: string, weekendDays: number[]) {
  return prisma.attendanceSettings.upsert({
      where: { organizationId },
      create: { organizationId, weekendDays },
      update: { weekendDays },
      select: { weekendDays: true },
    });
}
