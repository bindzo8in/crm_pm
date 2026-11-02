import prisma from "@/lib/prisma";
import { DEFAULT_WEEKEND_DAYS } from "@/lib/weekend-policy";

export async function getWeekendDays() {
  const settings = await prisma.attendanceSettings.findFirst({
    select: { weekendDays: true },
  });
  return settings?.weekendDays ?? [...DEFAULT_WEEKEND_DAYS];
}

export async function saveWeekendDays(weekendDays: number[]) {
  const existing = await prisma.attendanceSettings.findFirst({
    select: { id: true },
  });

  if (existing) {
    return prisma.attendanceSettings.update({
      where: { id: existing.id },
      data: { weekendDays },
      select: { weekendDays: true },
    });
  }

  return prisma.attendanceSettings.create({
    data: { weekendDays },
    select: { weekendDays: true },
  });
}
