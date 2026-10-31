import "dotenv/config";
import prisma from "@/lib/prisma";
import {
  calculateMonthlySalary,
  countWorkingDays,
} from "@/lib/salary-calculation";

const year = 2026;
const month = 9;
const allowedPaidLeaves = 1;

async function main() {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const [holidays, users] = await Promise.all([
    prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, name: true },
    }),
    prisma.user.findMany({
      where: { salaryStructure: { isNot: null } },
      select: {
        id: true,
        name: true,
        email: true,
        salaryStructure: true,
      },
      orderBy: { employeeId: "asc" },
    }),
  ]);

  const holidayKeys = new Set(
    holidays.map((holiday) => holiday.date.toISOString().slice(0, 10)),
  );
  console.log(`\nSeptember ${year} payroll reconciliation`);
  console.log(`Calendar days: ${totalDays}`);
  console.log(`Holidays: ${holidays.map((holiday) => holiday.name).join(", ") || "none"}`);
  console.log(`Employees with salary structures: ${users.length}\n`);

  let totalNet = 0;
  const rows: Array<Record<string, string | number>> = [];

  for (const user of users) {
    const structure = user.salaryStructure;
    if (!structure) continue;

    const [attendance, leaves] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { userId: user.id, date: { gte: start, lte: end } },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: user.id,
          status: "APPROVED",
          startDate: { lte: end },
          endDate: { gte: start },
        },
      }),
    ]);

    let presentDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    for (const record of attendance) {
      if (record.status === "PRESENT" || record.status === "LATE") presentDays++;
      else if (record.status === "HALF_DAY") halfDays++;
      else if (record.status === "ABSENT") absentDays++;
    }

    let leaveDays = 0;
    for (const leave of leaves) {
      const leaveStart = leave.startDate < start ? start : leave.startDate;
      const leaveEnd = leave.endDate > end ? end : leave.endDate;
      leaveDays += countWorkingDays(leaveStart, leaveEnd, holidayKeys);
    }

    const grossBase =
      Number(structure.basicSalary) +
      Number(structure.hra) +
      Number(structure.conveyance) +
      Number(structure.medical) +
      Number(structure.specialAllowance);
    const fixedDeductions =
      Number(structure.providentFund) +
      Number(structure.professionalTax) +
      Number(structure.tds);
    const calculation = calculateMonthlySalary({
      grossBase,
      totalDaysInMonth: totalDays,
      presentDays,
      halfDays,
      absentDays,
      chargeableLeaveDays: leaveDays,
      allowedPaidLeaves,
      fixedDeductions,
    });
    totalNet += calculation.netSalary;

    await prisma.salarySlip.upsert({
      where: { userId_month_year: { userId: user.id, month, year } },
      update: {
        status: "GENERATED",
        totalDays,
        paidDays: calculation.paidDays,
        presentDays,
        absentDays: absentDays + calculation.unpaidLeaves,
        leaveDays,
        halfDays,
        basicSalary: structure.basicSalary,
        hra: structure.hra,
        conveyance: structure.conveyance,
        medical: structure.medical,
        specialAllowance: structure.specialAllowance,
        providentFund: structure.providentFund,
        professionalTax: structure.professionalTax,
        tds: structure.tds,
        absentDeduction: calculation.absentDeduction,
        totalEarnings: calculation.totalEarnings,
        totalDeductions: calculation.totalDeductions,
        netSalary: calculation.netSalary,
      },
      create: {
        userId: user.id,
        month,
        year,
        status: "GENERATED",
        totalDays,
        paidDays: calculation.paidDays,
        presentDays,
        absentDays: absentDays + calculation.unpaidLeaves,
        leaveDays,
        halfDays,
        basicSalary: structure.basicSalary,
        hra: structure.hra,
        conveyance: structure.conveyance,
        medical: structure.medical,
        specialAllowance: structure.specialAllowance,
        providentFund: structure.providentFund,
        professionalTax: structure.professionalTax,
        tds: structure.tds,
        absentDeduction: calculation.absentDeduction,
        totalEarnings: calculation.totalEarnings,
        totalDeductions: calculation.totalDeductions,
        netSalary: calculation.netSalary,
      },
    });

    rows.push({
      employee: user.name,
      attendance: attendance.length,
      present: presentDays,
      halfDays,
      absent: absentDays,
      leaveDays,
      paidDays: calculation.paidDays,
      gross: grossBase.toFixed(2),
      deduction: calculation.absentDeduction.toFixed(2),
      netSalary: calculation.netSalary.toFixed(2),
    });
  }

  console.table(rows);
  console.log(`Generated slips: ${rows.length}`);
  console.log(`Combined net payroll: INR ${totalNet.toFixed(2)}\n`);

  const storedSlips = await prisma.salarySlip.findMany({
    where: { month, year },
    select: {
      userId: true,
      totalDays: true,
      paidDays: true,
      presentDays: true,
      absentDays: true,
      leaveDays: true,
      halfDays: true,
      totalEarnings: true,
      totalDeductions: true,
      netSalary: true,
    },
  });
  const userIds = new Set(users.map((user) => user.id));
  const mismatchedStructures = storedSlips.filter(
    (slip) => !userIds.has(slip.userId),
  );
  console.log(`Stored September slips: ${storedSlips.length}`);
  console.log(`Unexpected slips: ${mismatchedStructures.length}`);
  console.log(
    storedSlips.reduce(
      (valid, slip) =>
        valid &&
        Number(slip.totalDays) === totalDays &&
        Number(slip.totalEarnings) >= 0 &&
        Number(slip.totalDeductions) >= 0 &&
        Math.abs(
          Number(slip.totalEarnings) -
            Number(slip.totalDeductions) -
            Number(slip.netSalary),
        ) < 0.01,
      mismatchedStructures.length === 0,
    )
      ? "Slip arithmetic reconciliation: PASS"
      : "Slip arithmetic reconciliation: FAIL",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
