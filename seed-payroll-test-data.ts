import "dotenv/config";
import prisma from "./lib/prisma";
import { EmploymentStatus, LeaveStatus, LeaveType } from "./app/generated/prisma/enums";

async function main() {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: { employmentStatus: EmploymentStatus.ACTIVE },

    select: {
      id: true,
      name: true,
      organizationMemberships: {
        select: { organizationId: true },
      },
    },
    orderBy: { employeeId: "asc" },
  });

  let leaveRecords = 0;
  let salaryStructures = 0;

  let index = 0;
  for (const user of users) {
    for (const membership of user.organizationMemberships) {
      await prisma.salaryStructure.upsert({
        where: {
          organizationId_userId: {
            organizationId: membership.organizationId,
            userId: user.id,
          },
        },
        create: {
          organizationId: membership.organizationId,
          userId: user.id,
          basicSalary: 30000 + index * 2500,
          hra: 12000 + index * 1000,
          conveyance: 1600,
          medical: 1250,
          specialAllowance: 8000 + index * 500,
          providentFund: 1800,
          professionalTax: 200,
          tds: 1500,
        },
        update: {},
      });
      salaryStructures++;

      const approvedStart = new Date(now.getFullYear(), now.getMonth(), 10 + (index % 3));
      const approvedEnd = new Date(approvedStart);
      approvedEnd.setDate(approvedEnd.getDate() + 1);

      const existingLeave = await prisma.leaveRequest.findFirst({
        where: {
          organizationId: membership.organizationId,
          userId: user.id,
          startDate: approvedStart,
          endDate: approvedEnd,
        },
      });
      if (!existingLeave) {
        await prisma.leaveRequest.create({
          data: {
            organizationId: membership.organizationId,
            userId: user.id,
            type: index % 2 === 0 ? LeaveType.CASUAL : LeaveType.SICK,
            startDate: approvedStart,
            endDate: approvedEnd,
            reason: "Payroll test leave",
            status: LeaveStatus.APPROVED,
            managerComment: "Approved for payroll testing",
            totalDays: 2,
            netLeaveDays: 2,
          },
        });
        leaveRecords++;
      }

      index++;
    }
  }

  console.log(`Prepared ${salaryStructures} salary structures and ${leaveRecords} approved leave records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
