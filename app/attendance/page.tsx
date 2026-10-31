import { requireAttendanceAccess } from "@/lib/attendance-guard";
import { getTodayAttendanceAction } from "@/actions/attendance";
import { AttendanceClientHub } from "@/components/attendance/attendance-client-hub";
import { AttendanceBrand } from "@/components/attendance/attendance-brand";
import { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboardIcon,
  UserIcon,
  AlertCircleIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserRole, WorkMode } from "@/app/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Attendance Kiosk & Portal | CRM",
  description: "Dedicated mobile kiosk attendance portal and analytics.",
};

export default async function AttendancePage() {
  const { user, isAuthorized, hasDepartment } =
    await requireAttendanceAccess();

  if (!isAuthorized) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
        <section className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-5 shadow-xl sm:space-y-6 sm:rounded-3xl sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive sm:h-16 sm:w-16 sm:rounded-full">
            <ShieldAlertIcon className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Access Restricted
            </h1>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {!hasDepartment ? (
                <>
                  You are not currently assigned to any{" "}
                  <strong>department</strong>. Access to the Attendance Portal
                  is only permitted for staff members belonging to an active
                  department.
                </>
              ) : (
                <>
                  Your user role does not have permission to access the
                  Attendance Portal.
                </>
              )}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-left text-amber-700 dark:text-amber-300 sm:rounded-2xl sm:p-4">
            <AlertCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold">Need Access?</p>
              <p className="text-xs leading-relaxed sm:text-sm">
                Please contact an Administrator or HR manager to assign your
                account to a department, such as Sales, Development, Design,
                SEO, Marketing, HR, or Operations.
              </p>
            </div>
          </div>

          <Button
            asChild
            className="h-11 w-full rounded-xl font-semibold sm:rounded-2xl"
          >
            <Link href="/dashboard">
              <LayoutDashboardIcon className="mr-2 h-4 w-4 shrink-0" />
              Return to Dashboard
            </Link>
          </Button>
        </section>
      </main>
    );
  }

  let record = null;
  let settings = null;
  let userRole = (user.role || "STAFF") as UserRole;

  try {
    const res = await getTodayAttendanceAction();

    record = res.record;
    settings = res.settings;
    userRole = res.userRole as UserRole;
  } catch (error) {
    console.error("Failed to load today's attendance record:", error);
  }

  const workMode = (user.workMode ?? WorkMode.OFFICE) as WorkMode;

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-clip bg-background font-sans text-foreground">
      {/* Responsive Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-3 gap-y-3 px-3 py-3 sm:px-5 md:px-8">
          {/* Brand */}
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-initial sm:gap-3"
          >
            <AttendanceBrand subtitle="Attendance Portal" />
          </Link>

          {/* Navigation Actions */}
          <nav
            aria-label="Attendance navigation"
            className="flex shrink-0 items-center gap-2 sm:gap-3"
          >
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl px-2.5 text-xs font-semibold sm:h-10 sm:rounded-2xl sm:px-4 sm:text-sm"
            >
              <Link href="/attendance/profile">
                <UserIcon className="h-4 w-4 shrink-0 text-primary sm:mr-2" />
                <span className="hidden xs:inline sm:inline">Profile</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl px-2.5 text-xs font-semibold sm:h-10 sm:rounded-2xl sm:px-4 sm:text-sm"
            >
              <Link href="/dashboard">
                <LayoutDashboardIcon className="h-4 w-4 shrink-0 text-primary sm:mr-2" />
                <span className="hidden xs:inline sm:inline">Dashboard</span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Attendance Content */}
      <main className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full min-w-0 max-w-7xl">
          <AttendanceClientHub
            initialRecord={record}
            settings={settings}
            userRole={userRole}
            userDepartment={user.department || ""}
            workMode={workMode}
          />
        </div>
      </main>
    </div>
  );
}
