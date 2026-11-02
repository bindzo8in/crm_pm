export const DEFAULT_EMPLOYEE_ID_PREFIX = "EMP-";

export function formatEmployeeId(
  employeeId: number | string | null | undefined,
  prefix: string = DEFAULT_EMPLOYEE_ID_PREFIX,
): string | null {
  if (employeeId === null || employeeId === undefined || employeeId === "") {
    return null;
  }

  const value = String(employeeId);
  if (prefix && value.startsWith(prefix)) {
    return value;
  }

  return `${prefix}${value.padStart(3, "0")}`;
}
