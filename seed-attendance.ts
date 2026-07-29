import dotenv from 'dotenv/config';
import prisma from "./lib/prisma";


async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'oneclicktechy@gmail.com' }
  });
  if (!user) {
    console.error('No users found in database to attach attendance records to.');
    return;
  }

  console.log(`Seeding attendance for user: ${user.name} (${user.id})`);

  const now = new Date();
  
  // Seed 5 past days
  for (let i = 1; i <= 5; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(9, 0, 0, 0); // 9 AM clock in
    
    const clockOut = new Date(d);
    clockOut.setHours(17, 30, 0, 0); // 5:30 PM clock out

    await prisma.attendanceRecord.create({
      data: {
        userId: user.id,
        date: d,
        clockIn: d,
        clockOut: clockOut,
        workMode: 'OFFICE',
        status: i % 2 === 0 ? 'PRESENT' : 'LATE', // mix of present and late
        workMinutes: 510, // 8.5 hours
      }
    });
    
    console.log(`Created record for ${d.toISOString().split('T')[0]}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
