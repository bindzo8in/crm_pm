"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { UserRole } from "@/app/generated/prisma/enums";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const holidaySchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.coerce.date(),
  description: z.string().optional().nullable(),
});

export async function getHolidaysAction() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const holidays = await prisma.holiday.findMany({
    orderBy: { date: "asc" },
  });

  return { success: true, holidays };
}

export async function getUpcomingHolidaysAction() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: today },
    },
    orderBy: { date: "asc" },
    take: 10,
  });

  return { success: true, holidays };
}

export async function createHolidayAction(input: any) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    throw new Error("Unauthorized");
  }

  const parsed = holidaySchema.parse(input);

  const holiday = await prisma.holiday.create({
    data: {
      name: parsed.name,
      date: parsed.date,
      description: parsed.description,
    },
  });

  revalidatePath("/dashboard/holidays");
  return { success: true, holiday };
}

export async function deleteHolidayAction(id: string) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.ADMIN)) {
    throw new Error("Unauthorized");
  }

  await prisma.holiday.delete({ where: { id } });

  revalidatePath("/dashboard/holidays");
  return { success: true };
}
