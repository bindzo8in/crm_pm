"use server";

import { UserRole } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { DEFAULT_WEEKEND_DAYS } from "@/lib/weekend-policy";
import { getInitialSetupStatus } from "@/lib/initial-setup";
import { initialSetupSchema, type InitialSetupInput } from "@/lib/schemas/initial-setup";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function completeInitialSetup(input: InitialSetupInput) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return { success: false, error: "Only the initial administrator can complete setup." };
  }
  if ((await getInitialSetupStatus()).complete) {
    return { success: false, error: "Company setup has already been completed." };
  }

  const parsed = initialSetupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Review the setup information and try again.",
    };
  }

  try {
    const values = parsed.data;
    await prisma.$transaction(async (transaction) => {
      const existingCompany = await transaction.company.findFirst({
        select: { id: true },
      });
      const companyData = {
        displayName: values.displayName,
        legalName: values.legalName,
        employeeIdPrefix: "EMP-",
        email: values.email,
        phone: values.phone,
        address: values.address,
        city: values.city,
        state: values.state,
        country: values.country,
        postalCode: values.postalCode || null,
      };

      if (existingCompany) {
        await transaction.company.update({
          where: { id: existingCompany.id },
          data: companyData,
        });
      } else {
        await transaction.company.create({ data: companyData });
      }

      const existingSettings = await transaction.attendanceSettings.findFirst({
        select: { id: true, weekendDays: true },
      });
      const settingsData = {
        expectedClockIn: values.expectedClockIn,
        expectedClockOut: values.expectedClockOut,
        attendanceReminderTime: values.attendanceReminderTime,
        gracePeriodMinutes: values.gracePeriodMinutes,
        halfDayThresholdMinutes: 240,
        maxShiftHoursCap: 16,
        allowOvernightShift: true,
        officeLatitude: values.officeLatitude,
        officeLongitude: values.officeLongitude,
        officeRadiusMeters: values.officeRadiusMeters,
        enforceOfficeGeofence: true,
        weekendDays: existingSettings?.weekendDays ?? [...DEFAULT_WEEKEND_DAYS],
        isConfigured: true,
      };

      if (existingSettings) {
        await transaction.attendanceSettings.update({
          where: { id: existingSettings.id },
          data: settingsData,
        });
      } else {
        await transaction.attendanceSettings.create({ data: settingsData });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/attendance");
    return { success: true };
  } catch (error) {
    console.error("Failed to complete initial company setup:", error);
    return {
      success: false,
      error: "Setup could not be saved. Please try again.",
    };
  }
}
