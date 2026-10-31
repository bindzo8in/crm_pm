import "dotenv/config";
import prisma from "./lib/prisma";
import { AttendanceStatus, EmploymentStatus } from "./app/generated/prisma/enums";


async function main() {
  const users = await prisma.user.findMany({
    where: { employmentStatus: EmploymentStatus.ACTIVE },
    select: { id: true, name: true, email: true },
  });
  if (!users.length) {
    console.error("No active users found for attendance.");
    return;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = Math.min(now.getDate(), 31);

  let created = 0;
  for (const user of users) {
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const existing = await prisma.attendanceRecord.findUnique({
        where: { userId_date: { userId: user.id, date } },
      });
      if (existing) continue;

      const status = day % 9 === 0
        ? AttendanceStatus.LATE
        : day % 13 === 0
          ? AttendanceStatus.HALF_DAY
          : AttendanceStatus.PRESENT;
      const clockIn = new Date(year, month, day, status === AttendanceStatus.LATE ? 10 : 9, 0, 0);
      const workMinutes = status === AttendanceStatus.HALF_DAY ? 240 : 510;
      const clockOut = new Date(clockIn.getTime() + workMinutes * 60_000);

      await prisma.attendanceRecord.create({
        data: {
          userId: user.id,
          date,
          clockIn,
          clockOut,
          workMode: "OFFICE",
          status,
          workMinutes,
          lateMinutes: status === AttendanceStatus.LATE ? 60 : 0,
        },
      });
      created++;
    }
  }

  console.log(`Seeded ${created} attendance records for ${year}-${String(month + 1).padStart(2, "0")}.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
