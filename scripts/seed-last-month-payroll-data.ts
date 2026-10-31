import "dotenv/config";
import prisma from "@/lib/prisma";
import {
  AttendanceStatus,
  EmploymentStatus,
  HolidayCategory,
  LeaveStatus,
  LeaveType,
  WorkMode,
} from "@/app/generated/prisma/enums";

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  const now = new Date();
  const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const year = previousMonthDate.getUTCFullYear();
  const month = previousMonthDate.getUTCMonth() + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const users = await prisma.user.findMany({
    where: { employmentStatus: EmploymentStatus.ACTIVE },
    select: { id: true, department: true },
    orderBy: { employeeId: "asc" },
  });

  if (users.length === 0) {
    throw new Error("No active employees found.");
  }

  const holidayDates = [8, 15, 26].filter((day) => day <= daysInMonth);
  const holidayRecords = [
    ["Payroll Test Foundation Day", holidayDates[0]],
    ["Payroll Test Company Day", holidayDates[1]],
    ["Payroll Test Regional Holiday", holidayDates[2]],
  ] as const;

  let holidaysCreated = 0;
  for (const [name, day] of holidayRecords) {
    const date = utcDate(year, month, day);
    const existing = await prisma.holiday.findUnique({ where: { date } });
    if (!existing) {
      await prisma.holiday.create({
        data: {
          name,
          date,
          category: HolidayCategory.COMPANY_SPECIAL,
          departments: [],
          notifyStaff: true,
          description: "Seeded payroll test holiday",
        },
      });
      holidaysCreated++;
    }
  }

  let attendanceCreated = 0;
  const holidayDays = new Set(holidayDates);

  for (const [userIndex, user] of users.entries()) {
    for (let day = 1; day <= daysInMonth; day++) {
      const date = utcDate(year, month, day);
      const weekday = date.getUTCDay();
      if (
        weekday === 0 ||
        weekday === 6 ||
        holidayDays.has(day) ||
        (day >= 21 && day <= 22)
      ) continue;

      const existing = await prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId: user.id, date } },
      });
      if (existing) continue;

      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let clockInHour = 9;
      let clockInMinute = 0;
      let workMinutes = 540;
      let lateMinutes = 0;

      if ((day + userIndex) % 13 === 0) {
        status = AttendanceStatus.ABSENT;
        clockInHour = 0;
        clockInMinute = 0;
        workMinutes = 0;
      } else if ((day + userIndex) % 9 === 0) {
        status = AttendanceStatus.LATE;
        clockInHour = 10;
        clockInMinute = 15;
        workMinutes = 480;
        lateMinutes = 75;
      } else if ((day + userIndex) % 11 === 0) {
        status = AttendanceStatus.HALF_DAY;
        clockInHour = 9;
        clockInMinute = 0;
        workMinutes = 240;
      }

      const clockIn =
        status === AttendanceStatus.ABSENT
          ? new Date(Date.UTC(year, month - 1, day))
          : new Date(Date.UTC(year, month - 1, day, clockInHour, clockInMinute));
      const clockOut = clockIn
        ? new Date(clockIn.getTime() + workMinutes * 60_000)
        : null;

      await prisma.attendanceRecord.create({
        data: {
          userId: user.id,
          date,
          clockIn,
          clockOut,
          status,
          workMode:
            (day + userIndex) % 3 === 0 ? WorkMode.REMOTE : WorkMode.OFFICE,
          department: user.department,
          workMinutes,
          lateMinutes,
          notes: "Seeded last-month payroll test record",
        },
      });
      attendanceCreated++;
    }

    for (const day of [21, 22]) {
      const date = utcDate(year, month, day);
      if (
        date.getUTCDay() === 0 ||
        date.getUTCDay() === 6 ||
        holidayDays.has(day)
      ) continue;

      const existing = await prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId: user.id, date } },
      });
      if (!existing) {
        await prisma.attendanceRecord.create({
          data: {
            userId: user.id,
            date,
            clockIn: new Date(Date.UTC(year, month - 1, day)),
            status: AttendanceStatus.ON_LEAVE,
            workMode: WorkMode.OFFICE,
            department: user.department,
            workMinutes: 0,
            notes: "Seeded approved leave payroll record",
          },
        });
        attendanceCreated++;
      }
    }

    const approvedStart = utcDate(year, month, 21);
    const approvedEnd = utcDate(year, month, 22);
    const approvedExists = await prisma.leaveRequest.findFirst({
      where: {
        userId: user.id,
        reason: "Payroll test approved leave",
        startDate: approvedStart,
      },
    });
    if (!approvedExists) {
      await prisma.leaveRequest.create({
        data: {
          userId: user.id,
          type: userIndex % 2 === 0 ? LeaveType.CASUAL : LeaveType.SICK,
          startDate: approvedStart,
          endDate: approvedEnd,
          reason: "Payroll test approved leave",
          status: LeaveStatus.APPROVED,
          managerComment: "Approved for payroll testing",
          totalDays: 2,
          netLeaveDays: 2,
          sundayCount: 0,
          holidayCount: 0,
        },
      });
    }

    const pendingStart = utcDate(year, month, Math.min(23, daysInMonth));
    const pendingExists = await prisma.leaveRequest.findFirst({
      where: {
        userId: user.id,
        reason: "Payroll test pending leave",
        startDate: pendingStart,
      },
    });
    if (!pendingExists) {
      await prisma.leaveRequest.create({
        data: {
          userId: user.id,
          type: LeaveType.ANNUAL,
          startDate: pendingStart,
          endDate: pendingStart,
          reason: "Payroll test pending leave",
          status: LeaveStatus.PENDING,
          totalDays: 1,
          netLeaveDays: 1,
          sundayCount: 0,
          holidayCount: 0,
        },
      });
    }
  }

  console.log(
    `Seeded ${attendanceCreated} attendance records, ${holidaysCreated} holidays, and leave requests for ${year}-${String(month).padStart(2, "0")}.`,
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
