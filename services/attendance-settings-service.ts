import {
  getWeekendDays as readWeekendDays,
  saveWeekendDays,
} from "@/repositories/attendance-settings-repository";

export async function getWeekendDays() {
  return [...new Set(await readWeekendDays())].sort(
    (left, right) => left - right,
  );
}

export async function updateWeekendDays(weekendDays: number[]) {
  const sortedDays = [...new Set(weekendDays)].sort((left, right) => left - right);
  return saveWeekendDays(sortedDays);
}
