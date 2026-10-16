import { ActionError } from "@/lib/action-error";
import { getAttendanceDate } from "@/lib/date";
import { parseDateOnly } from "@/lib/leave-policy";
import {
  createHoliday as insertHoliday,
  deleteHoliday as deleteHolidayRecord,
  isUniqueHolidayDateConflict,
  listHolidays,
  listUpcomingHolidays,
  updateHoliday as saveHoliday,
  type HolidayWriteData,
} from "@/repositories/holiday-repository";

export async function getHolidaysForYear(year: number) {
  return listHolidays(
    new Date(Date.UTC(year, 0, 1)),
    new Date(Date.UTC(year + 1, 0, 1) - 1),
  );
}

export async function getUpcomingHolidays() {
  const today = parseDateOnly(getAttendanceDate());
  return listUpcomingHolidays(today);
}

export async function addHoliday(data: HolidayWriteData) {
  try {
    return await insertHoliday(data);
  } catch (error) {
    if (isUniqueHolidayDateConflict(error)) {
      throw new ActionError("A holiday is already recorded for this date.", 409);
    }
    throw error;
  }
}

export async function editHoliday(id: string, data: HolidayWriteData) {
  try {
    return await saveHoliday(id, data);
  } catch (error) {
    if (isUniqueHolidayDateConflict(error)) {
      throw new ActionError("A holiday is already recorded for this date.", 409);
    }
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new ActionError("Holiday not found.", 404);
    }
    throw error;
  }
}

export async function removeHoliday(id: string) {
  try {
    await deleteHolidayRecord(id);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2025"
    ) {
      throw new ActionError("Holiday not found.", 404);
    }
    throw error;
  }
}
