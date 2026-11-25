import {
  getWeekendDays as readWeekendDays,
  saveWeekendDays,
} from "@/repositories/attendance-settings-repository";

export async function getWeekendDays(organizationId: string) {
  return [...new Set(await readWeekendDays(organizationId))].sort(
    (left, right) => left - right,
  );
}

export async function updateWeekendDays(
  organizationId: string,
  weekendDays: number[],
) {
  const sortedDays = [...new Set(weekendDays)].sort((left, right) => left - right);
  return saveWeekendDays(organizationId, sortedDays);
}
