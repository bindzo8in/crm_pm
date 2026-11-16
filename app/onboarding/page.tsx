import { InitialSetupForm } from "@/components/onboarding/initial-setup-form";
import { auth } from "@/lib/auth";
import { getInitialSetupStatus } from "@/lib/initial-setup";
import { isOrganizationSetupOwner } from "@/lib/organization-setup-access";
import { isPlatformSuperAdmin } from "@/lib/global-role";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Organization setup | Bindzo8 CRM",
};

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/signin?callbackUrl=%2Fonboarding");
  }
  if (isPlatformSuperAdmin(session.user.role)) {
    redirect("/platform/organizations");
  }
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    redirect("/dashboard/organizations");
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
    redirect("/dashboard");
  }

  const { complete, company, attendanceSettings } =
    await getInitialSetupStatus(organizationId);
  if (complete) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-primary">
            Bindzo8 CRM · Organization owner setup
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Let&apos;s set up your organization
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Add your organization&apos;s company details, working hours, and
            office location. This setup belongs to the active organization.
          </p>
        </header>

        <InitialSetupForm
          email={session.user.email}
          contactName={session.user.name}
          defaults={{
            displayName: company?.displayName,
            legalName: company?.legalName,
            email: company?.email,
            phone: company?.phone,
            address: company?.address,
            city: company?.city,
            state: company?.state,
            country: company?.country,
            postalCode: company?.postalCode ?? "",
            expectedClockIn: attendanceSettings?.expectedClockIn,
            expectedClockOut: attendanceSettings?.expectedClockOut,
            attendanceReminderTime: attendanceSettings?.attendanceReminderTime,
            gracePeriodMinutes: attendanceSettings?.gracePeriodMinutes,
            officeLatitude: attendanceSettings?.officeLatitude,
            officeLongitude: attendanceSettings?.officeLongitude,
            officeRadiusMeters: attendanceSettings?.officeRadiusMeters,
          }}
        />
      </div>
    </main>
  );
}
