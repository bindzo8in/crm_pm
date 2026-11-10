export const attendanceE2ERoster = [
  {
    key: "ceo",
    name: "E2E Founder CEO",
    designation: "Founder / CEO",
    role: "SUPER_ADMIN",
    department: null,
  },
  {
    key: "admin",
    name: "E2E Operations Admin",
    designation: "Operations Administrator",
    role: "ADMIN",
    department: "OPERATIONS",
  },
  {
    key: "sales",
    name: "E2E Sales Employee",
    designation: "Sales Representative",
    role: "STAFF",
    department: "SALES",
  },
  {
    key: "development",
    name: "E2E Development Employee",
    designation: "Software Developer",
    role: "STAFF",
    department: "DEVELOPMENT",
  },
  {
    key: "design",
    name: "E2E Design Employee",
    designation: "Designer",
    role: "STAFF",
    department: "DESIGN",
  },
  {
    key: "seo",
    name: "E2E SEO Employee",
    designation: "SEO Specialist",
    role: "STAFF",
    department: "SEO",
  },
  {
    key: "marketing",
    name: "E2E Marketing Employee",
    designation: "Marketing Specialist",
    role: "STAFF",
    department: "MARKETING",
  },
  {
    key: "hr",
    name: "E2E HR Employee",
    designation: "HR Manager",
    role: "STAFF",
    department: "HR",
  },
  {
    key: "operations",
    name: "E2E Operations Employee",
    designation: "Operations Specialist",
    role: "STAFF",
    department: "OPERATIONS",
  },
] as const;

export type AttendanceE2EPersona = (typeof attendanceE2ERoster)[number];

export function attendanceE2EEmail(persona: AttendanceE2EPersona): string {
  return `attendance-e2e+${persona.key}@bindzo8.invalid`;
}

export function attendanceE2EMonthRange(month = process.env.ATTENDANCE_E2E_MONTH) {
  const resolvedMonth =
    month ?? getPreviousCalendarMonth(new Date());
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(resolvedMonth)) {
    throw new Error("ATTENDANCE_E2E_MONTH must use YYYY-MM format.");
  }

  const [yearText, monthText] = resolvedMonth.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const start = `${resolvedMonth}-01`;
  const endDate = new Date(Date.UTC(year, monthNumber, 0));
  const end = `${resolvedMonth}-${String(endDate.getUTCDate()).padStart(2, "0")}`;

  return { month: resolvedMonth, start, end };
}

function getPreviousCalendarMonth(date: Date): string {
  const previousMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1),
  );
  return `${previousMonth.getUTCFullYear()}-${String(
    previousMonth.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
}
