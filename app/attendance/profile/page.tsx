import { requireAttendanceAccess } from "@/lib/attendance-guard";
import { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboardIcon, ClockIcon, AlertCircleIcon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceBrand } from "@/components/attendance/attendance-brand";
import { LogoutConfirmButton } from "@/components/auth/logout-confirm-button";
import { ProfileWorkspace } from "@/components/settings/profile-workspace";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "My Attendance Profile | CRM",
  description: "Manage your personal attendance profile, shift identity, and account credentials.",
};

export default async function AttendanceProfilePage() {
  const { user, isAuthorized, hasDepartment } = await requireAttendanceAccess();

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlertIcon className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Access Restricted</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {!hasDepartment ? (
                <>
                  You are not currently assigned to any <strong>Department</strong>. Access to the Attendance Portal is only permitted for users belonging to an active department.
                </>
              ) : (
                <>
                  Your user role does not have permission to access the Attendance Portal.
                </>
              )}
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-4 rounded-2xl text-xs text-left flex items-start gap-3">
            <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-0.5">Need Access?</p>
              <p>Please contact an Administrator or HR manager to assign your account to a department (Sales, Development, Design, SEO, Marketing, HR, or Operations).</p>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Button asChild className="w-full rounded-2xl font-semibold shadow-md">
              <Link href="/dashboard">
                <LayoutDashboardIcon className="w-4 h-4 mr-2" /> Return to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const departmentMemberships = await prisma.user.findUnique({
    where: { id: user.id },
    select: { department: true, additionalDepartments: true },
  });
  if (!departmentMemberships) {
    throw new Error("Account profile could not be loaded.");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Standalone Header */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-2 border-b border-border/60 bg-card/95 px-3 py-2.5 shadow-sm backdrop-blur sm:px-4 sm:py-3 md:px-8">
        <AttendanceBrand subtitle="Attendance Profile" hideSubtitleOnMobile />

        <nav aria-label="Profile navigation" className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button asChild variant="default" size="icon" className="size-9 rounded-xl shadow-sm sm:w-auto sm:px-3">
            <Link href="/attendance" aria-label="Punch clock" title="Punch clock">
              <ClockIcon className="size-4 shrink-0 sm:mr-1.5" />
              <span className="hidden sm:inline">Punch Clock</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="icon" className="size-9 rounded-xl shadow-sm sm:w-auto sm:px-3">
            <Link href="/dashboard" aria-label="Dashboard" title="Dashboard">
              <LayoutDashboardIcon className="size-4 shrink-0 text-primary sm:mr-1.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </Button>

          <LogoutConfirmButton />
        </nav>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 p-4 pb-16 md:p-8">
        <ProfileWorkspace
          showAttendanceAccess
          showLogoutButton={false}
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image ?? null,
            role: user.role ?? "",
            department: departmentMemberships.department,
            additionalDepartments: departmentMemberships.additionalDepartments,
            createdAt: user.createdAt,
          }}
        />
      </main>
    </div>
  );
}
