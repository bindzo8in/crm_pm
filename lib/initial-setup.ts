import prisma from "@/lib/prisma";

export async function getInitialSetupStatus() {
  const [company, attendanceSettings] = await Promise.all([
    prisma.company.findFirst({
      select: {
        displayName: true,
        legalName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true,
      },
    }),
    prisma.attendanceSettings.findFirst({
      select: {
        expectedClockIn: true,
        expectedClockOut: true,
        attendanceReminderTime: true,
        gracePeriodMinutes: true,
        officeLatitude: true,
        officeLongitude: true,
        officeRadiusMeters: true,
        isConfigured: true,
      },
    }),
  ]);

  const complete =
    Boolean(company) &&
    attendanceSettings?.isConfigured === true &&
    Number.isFinite(attendanceSettings.officeLatitude) &&
    Number.isFinite(attendanceSettings.officeLongitude);

  return { complete, company, attendanceSettings };
}
