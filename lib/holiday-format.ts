import type { Department, HolidayCategory } from "@/app/generated/prisma/enums";

export const HOLIDAY_CATEGORY_LABELS: Record<HolidayCategory, string> = {
  MANDATORY_GAZETTED: "Mandatory / Gazetted",
  RESTRICTED_OPTIONAL: "Restricted / Optional",
  COMPANY_SPECIAL: "Company special",
};

export const HOLIDAY_DEPARTMENTS: { value: Department; label: string }[] = [
  { value: "SALES", label: "Sales" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "DESIGN", label: "Design" },
  { value: "SEO", label: "SEO" },
  { value: "MARKETING", label: "Marketing" },
  { value: "HR", label: "HR" },
  { value: "OPERATIONS", label: "Operations" },
];

export function formatHolidayDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  };
  const format = (date: Date, includeYear = true) =>
    new Intl.DateTimeFormat("en-IN", {
      ...options,
      ...(includeYear ? { year: "numeric" } : {}),
    }).format(date);

  if (startDate.getTime() === endDate.getTime()) {
    return format(startDate);
  }

  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
  const sameMonth = sameYear && startDate.getUTCMonth() === endDate.getUTCMonth();
  if (sameMonth) {
    return `${startDate.getUTCDate()}–${format(endDate)}`;
  }
  if (sameYear) {
    return `${format(startDate, false)}–${format(endDate)}`;
  }
  return `${format(startDate)}–${format(endDate)}`;
}

export function formatHolidayDepartmentScope(
  departments: readonly Department[],
): string {
  if (departments.length === 0) return "All departments";
  return HOLIDAY_DEPARTMENTS
    .filter(({ value }) => departments.includes(value))
    .map(({ label }) => label)
    .join(", ");
}
