import { formatInIST } from "@/lib/date";
import {
  canManageHolidays,
  getHolidayDepartment,
  requireHolidayUser,
} from "@/lib/leave-access";
import { getHolidaysForYear } from "@/services/holiday-service";
import DashboardContainer from "../dashboard-container";
import { HolidayCalendar } from "./holiday-calendar";

function getYear(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}$/.test(raw)) return undefined;
  const year = Number(raw);
  return year >= 2000 && year <= 2100 ? year : undefined;
}

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const user = await requireHolidayUser();
  const isManager = canManageHolidays(user);
  const year = getYear((await searchParams).year) ?? Number(formatInIST(new Date(), "yyyy"));
  const holidays = await getHolidaysForYear(year, getHolidayDepartment(user));

  return (
    <DashboardContainer title="Holidays">
      <HolidayCalendar
        key={year}
        year={year}
        today={formatInIST(new Date(), "yyyy-MM-dd")}
        isManager={isManager}
        holidays={holidays}
      />
    </DashboardContainer>
  );
}
