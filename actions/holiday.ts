"use server";

import {
  getHolidayDepartment,
  requireHolidayManager,
  requireHolidayUser,
} from "@/lib/leave-access";
import { formatInIST } from "@/lib/date";
import { parseDateOnly, toDateKey } from "@/lib/leave-policy";
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

const holidayFieldsSchema = z.object({
  name: z.string().trim().min(1, "Holiday name is required.").max(120),
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  category: z.enum([
    "MANDATORY_GAZETTED",
    "RESTRICTED_OPTIONAL",
    "COMPANY_SPECIAL",
  ]),
  departments: z.array(
    z.enum([
      "SALES",
      "DEVELOPMENT",
      "DESIGN",
      "SEO",
      "MARKETING",
      "HR",
      "OPERATIONS",
    ]),
  ),
  notifyStaff: z.boolean(),
  description: z.string().trim().max(500).nullable().optional(),
});

const yearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const holidayIdSchema = z.object({
  id: z.string().trim().min(1).max(100),
});

function validateHolidayRange(
  startDate: Date,
  endDate: Date,
  addIssue: (issue: {
    code: "custom";
    path: string[];
    message: string;
  }) => void,
) {
  const duration = (endDate.getTime() - startDate.getTime()) / 86_400_000;
  if (duration < 0) {
    addIssue({
      code: "custom",
      path: ["endDate"],
      message: "End date cannot be before start date.",
    });
  } else if (duration > 365) {
    addIssue({
      code: "custom",
      path: ["endDate"],
      message: "A holiday range cannot exceed 366 days.",
    });
  }
}

const holidaySchema = holidayFieldsSchema.superRefine((value, context) => {
  validateHolidayRange(value.startDate, value.endDate, context.addIssue);
});
const updateHolidaySchema = holidayFieldsSchema
  .extend(holidayIdSchema.shape)
  .superRefine((value, context) => {
    validateHolidayRange(value.startDate, value.endDate, context.addIssue);
  });

export async function getHolidaysAction(input: unknown = {}) {
  const user = await requireHolidayUser();
  const parsed = yearSchema.parse(input);
  const year = parsed.year ?? Number(formatInIST(new Date(), "yyyy"));
  return {
    success: true,
    holidays: await getHolidaysForYear(year, getHolidayDepartment(user)),
    year,
  };
}

export async function getUpcomingHolidaysAction() {
  const user = await requireHolidayUser();
  return {
    success: true,
    holidays: await getUpcomingHolidays(getHolidayDepartment(user)),
  };
}

export async function createHolidayAction(input: unknown) {
  await requireHolidayManager("create");
  const parsed = holidaySchema.parse(input);
  const currentMonthStart = `${formatInIST(new Date(), "yyyy-MM")}-01`;
  if (toDateKey(parsed.startDate) < currentMonthStart) {
    throw new Error("Choose a start date in the current month or later.");
  }
  const result = await addHoliday({
    name: parsed.name,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    category: parsed.category,
    departments: parsed.departments,
    notifyStaff: parsed.notifyStaff,
    description: parsed.description || null,
  });

  revalidatePath("/dashboard/holidays");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true, ...result };
}

export async function updateHolidayAction(input: unknown) {
  await requireHolidayManager("update");
  const parsed = updateHolidaySchema.parse(input);
  const result = await editHoliday(parsed.id, {
    name: parsed.name,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    category: parsed.category,
    departments: parsed.departments,
    notifyStaff: parsed.notifyStaff,
    description: parsed.description || null,
  });

  revalidatePath("/dashboard/holidays");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true, ...result };
}

export async function deleteHolidayAction(input: unknown) {
  await requireHolidayManager("delete");
  const { id } = holidayIdSchema.parse(input);
  await removeHoliday(id);

  revalidatePath("/dashboard/holidays");
  revalidatePath("/dashboard/leaves");
  revalidatePath("/dashboard");
  return { success: true };
}
