import prisma from "@/lib/prisma";
import { DEFAULT_EMPLOYEE_ID_PREFIX } from "@/lib/employee-id";

export async function getCompanyEmployeeIdPrefix(organizationId: string) {
  const company = await prisma.company.findFirst({
    where: { organizationId },
    select: { employeeIdPrefix: true },
  });
  return company?.employeeIdPrefix ?? DEFAULT_EMPLOYEE_ID_PREFIX;
}
