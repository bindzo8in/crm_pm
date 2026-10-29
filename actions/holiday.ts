"use server";

import {
  requireHolidayManager,
  requireHolidayUser,
} from "@/lib/leave-access";
import { formatInIST } from "@/lib/date";
import { parseDateOnly } from "@/lib/leave-policy";
import {
  addHoliday,
  editHoliday,
  getHolidaysForYear,
  getUpcomingHolidays,
  removeHoliday,
} from "@/services/holiday-service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid holiday date.")
  .refine((value) => {
    try {
      parseDateOnly(value);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid holiday date.")
  .transform(parseDateOnly);

const holidaySchema = z.object({
  name: z.string().trim().min(1, "Holiday name is required.").max(120),
  date: dateOnlySchema,
  description: z.string().trim().max(500).nullable().optional(),
});

const yearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const holidayIdSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

export async function getHolidaysAction(input: unknown = {}) {
  await requireHolidayUser();
  const parsed = yearSchema.parse(input);
  const year = parsed.year ?? Number(formatInIST(new Date(), "yyyy"));
  return { success: true, holidays: await getHolidaysForYear(year), year };
}

export async function getUpcomingHolidaysAction() {
  await requireHolidayUser();
  return { success: true, holidays: await getUpcomingHolidays() };
}

export async function createHolidayAction(input: unknown) {
  await requireHolidayManager("create");
  const parsed = holidaySchema.parse(input);
  const currentMonthStart = `${formatInIST(new Date(), "yyyy-MM")}-01`;
  if (parsed.date.toISOString().slice(0, 10) < currentMonthStart) {
    throw new Error("Choose a holiday date in the current month or later.");
  }
  const holiday = await addHoliday({
    name: parsed.name,
    date: parsed.date,
    description: parsed.description || null,
  });

  revalidatePath("/dashboard/holidays");
  revalidatePath("/dashboard");
  return { success: true, holiday };
}

export async function updateHolidayAction(input: unknown) {
  await requireHolidayManager("update");
  const parsed = holidaySchema.extend(holidayIdSchema.shape).parse(input);
  const holiday = await editHoliday(parsed.id, {
    name: parsed.name,
    date: parsed.date,
    description: parsed.description || null,
  });

  revalidatePath("/dashboard/holidays");
  revalidatePath("/dashboard");
  return { success: true, holiday };
}

export async function deleteHolidayAction(input: unknown) {
  await requireHolidayManager("delete");
  const { id } = holidayIdSchema.parse(input);
  await removeHoliday(id);

  revalidatePath("/dashboard/holidays");
  revalidatePath("/dashboard");
  return { success: true };
}
