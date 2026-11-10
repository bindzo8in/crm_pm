import { UserRole } from "@/app/generated/prisma/enums";
import { InitialSetupForm } from "@/components/onboarding/initial-setup-form";
import { auth } from "@/lib/auth";
import { getInitialSetupStatus } from "@/lib/initial-setup";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Company setup | Bindzo8 CRM",
};

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/signin?callbackUrl=%2Fonboarding");
  }
  if (session.user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  const { complete, company, attendanceSettings } =
    await getInitialSetupStatus();
  if (complete) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-svh bg-muted/20 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-primary">
            Bindzo8 CRM · Initial administrator setup
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Let&apos;s set up your office
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Add company details, working hours, and your office location. This
            setup is required before opening the CRM.
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
