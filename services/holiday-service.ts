import { ActionError } from "@/lib/action-error";
import { getAttendanceDate } from "@/lib/date";
import { parseDateOnly } from "@/lib/leave-policy";
import { sendHolidayAnnouncementEmails } from "@/lib/email";
import {
  createHolidayEvent,
  deleteHolidayEvent,
  isUniqueHolidayDateConflict,
  listHolidays,
  listUpcomingHolidays,
  updateHolidayEvent,
  type HolidayWriteData,
} from "@/repositories/holiday-repository";
import type { Department } from "@/app/generated/prisma/enums";

async function sendHolidayEmails(
  result: Awaited<ReturnType<typeof createHolidayEvent>>,
  data: HolidayWriteData,
) {
  if (!data.notifyStaff || result.recipients.length === 0) {
    return { sent: 0, failed: 0 };
  }
  return sendHolidayAnnouncementEmails({
    recipients: result.recipients,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    category: data.category,
    departments: data.departments,
  });
}

export async function getHolidaysForYear(
  year: number,
  department?: Department,
) {
  return listHolidays(
    new Date(Date.UTC(year, 0, 1)),
    new Date(Date.UTC(year + 1, 0, 1) - 1),
    department,
  );
}

export async function getUpcomingHolidays(department?: Department) {
  const today = parseDateOnly(getAttendanceDate());
  return listUpcomingHolidays(today, department);
}

export async function addHoliday(data: HolidayWriteData) {
  try {
    const result = await createHolidayEvent(data);
    const emailDelivery = await sendHolidayEmails(result, data);
    return {
      holiday: result.holidays[0],
      notificationCount: result.notificationCount,
      ...emailDelivery,
    };
  } catch (error) {
    if (isUniqueHolidayDateConflict(error)) {
      throw new ActionError(
        "One or more dates already have a holiday recorded.",
        409,
      );
    }
    throw error;
  }
}

export async function editHoliday(id: string, data: HolidayWriteData) {
  try {
    const result = await updateHolidayEvent(id, data);
    const emailDelivery = await sendHolidayEmails(result, data);
    return {
      holiday: result.holidays[0],
      notificationCount: result.notificationCount,
      ...emailDelivery,
    };
  } catch (error) {
    if (isUniqueHolidayDateConflict(error)) {
      throw new ActionError(
        "One or more dates already have a holiday recorded.",
        409,
      );
    }
    if (error instanceof Error && error.message === "Holiday not found.") {
      throw new ActionError("Holiday not found.", 404);
    }
    throw error;
  }
}

export async function removeHoliday(id: string) {
  try {
    await deleteHolidayEvent(id);
  } catch (error) {
    if (error instanceof Error && error.message === "Holiday not found.") {
      throw new ActionError("Holiday not found.", 404);
    }
    throw error;
  }
}
