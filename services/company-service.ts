import prisma from "@/lib/prisma";
import { DEFAULT_EMPLOYEE_ID_PREFIX } from "@/lib/employee-id";

export async function getCompanyEmployeeIdPrefix() {
  const company = await prisma.company.findFirst({
    select: { employeeIdPrefix: true },
  });
  return company?.employeeIdPrefix ?? DEFAULT_EMPLOYEE_ID_PREFIX;
}
