import prisma from "./lib/prisma";
import 'dotenv/config'
const holidays = [
  { name: 'Independence Day', date: new Date('2026-08-15'), description: 'National Holiday' },
  { name: 'Milad-un-Nabi', date: new Date('2026-08-26'), description: 'Regional Holiday' },
  { name: 'Krishna Jayanthi', date: new Date('2026-09-04'), description: 'Regional Holiday' },
  { name: 'Vinayakar Chathurthi', date: new Date('2026-09-14'), description: 'Regional Holiday' },
  { name: 'Gandhi Jayanthi', date: new Date('2026-10-02'), description: 'National Holiday' },
  { name: 'Ayutha Pooja', date: new Date('2026-10-19'), description: 'Regional Holiday' },
  { name: 'Vijaya Dasami', date: new Date('2026-10-20'), description: 'Regional Holiday' },
  { name: 'Deepavali', date: new Date('2026-11-08'), description: 'Regional Holiday' },
  { name: 'Christmas', date: new Date('2026-12-25'), description: 'Regional Holiday' },
];

async function main() {
  console.log('Seeding holidays...');
  for (const h of holidays) {
    const existing = await prisma.holiday.findFirst({ where: { date: h.date, name: h.name } });
    if (!existing) {
      await prisma.holiday.create({ data: h });
      console.log(`Added: ${h.name}`);
    } else {
      console.log(`Skipped (already exists): ${h.name}`);
    }
  }
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
