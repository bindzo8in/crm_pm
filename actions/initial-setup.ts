"use server";

import { auth } from "@/lib/auth";
import { DEFAULT_WEEKEND_DAYS } from "@/lib/weekend-policy";
import { getInitialSetupStatus } from "@/lib/initial-setup";
import { initialSetupSchema, type InitialSetupInput } from "@/lib/schemas/initial-setup";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isOrganizationSetupOwner } from "@/lib/organization-setup-access";

export async function completeInitialSetup(input: InitialSetupInput) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const organizationId = session?.session.activeOrganizationId;
  if (!session?.user || !organizationId) {
    return { success: false, error: "Select an organization before completing setup." };
  }
  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });
  if (!isOrganizationSetupOwner(membership?.role)) {
    return { success: false, error: "Only this organization’s owner can complete setup." };
  }
  if ((await getInitialSetupStatus(organizationId)).complete) {
    return { success: false, error: "Organization setup has already been completed." };
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
      const companyData = {
        organizationId,
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

      await transaction.company.upsert({
        where: { organizationId },
        update: companyData,
        create: companyData,
      });

      const existingSettings = await transaction.attendanceSettings.findUnique({
        where: { organizationId },
        select: { weekendDays: true },
      });
      const settingsData = {
        organizationId,
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

      await transaction.attendanceSettings.upsert({
        where: { organizationId },
        update: settingsData,
        create: settingsData,
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/attendance");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Failed to complete initial company setup:", error);
    return {
      success: false,
      error: "Setup could not be saved. Please try again.",
    };
  }
}
