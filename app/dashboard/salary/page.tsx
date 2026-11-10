import { Metadata } from "next";
import { SalaryDashboardHub } from "@/components/salary/salary-dashboard-hub";
import {
  getSalaryManagementSummaryAction,
  getSalaryRosterAction,
  getSalarySlipsAction,
} from "@/actions/salary";
import { requirePageAccess } from "@/lib/auth-guard";
import { UserRole } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSalaryPin, isSalaryPinSessionValid } from "@/lib/salary-pin";
import { SalaryPinGate } from "@/components/salary/salary-pin-gate";

export const metadata: Metadata = {
  title: "Salary Management | CRM",
};

export default async function SalaryDashboardPage() {
  const session = await requirePageAccess("/dashboard/salary");
  const user = session.user;

  const isHrOrAdmin = 
    user.role === UserRole.SUPER_ADMIN || 
    user.role === UserRole.ADMIN || 
    (user.role === UserRole.STAFF && user.department === 'HR');

  if (!isHrOrAdmin) {
    redirect("/dashboard/my-salary");
  }

  const isPinConfigured = await hasSalaryPin(user.id);
  const isPinUnlocked =
    isPinConfigured && (await isSalaryPinSessionValid(user.id));
  if (!isPinUnlocked) {
    return (
      <DashboardContainer title="Salary Management">
        <div className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
          <SalaryPinGate
            email={user.email}
            isConfigured={isPinConfigured}
            isUnlocked={false}
          />
        </div>
      </DashboardContainer>
    );
  }

  const [rosterRes, slipsRes, summaryRes] = await Promise.all([
    getSalaryRosterAction({ page: 0, pageSize: 20, view: "included" }),
    getSalarySlipsAction({ page: 0, pageSize: 20 }),
    getSalaryManagementSummaryAction(),
  ]);
  let staffProfile: {
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
    dateOfJoining: string | null;
  } | undefined;
  let staffLeaveSummary: { approvedDays: number; pendingRequests: number } | undefined;

  if (!isHrOrAdmin) {
    const [profile, approvedLeaves, pendingLeaveCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          name: true,
          email: true,
          department: true,
          designation: true,
          dateOfJoining: true,
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          userId: user.id,
          status: "APPROVED",
          startDate: { gte: new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`) },
        },
        select: { netLeaveDays: true },
      }),
      prisma.leaveRequest.count({
        where: {
          userId: user.id,
          status: "PENDING",
        },
      }),
    ]);
    if (profile) {
      staffProfile = {
        ...profile,
        dateOfJoining: profile.dateOfJoining?.toISOString().slice(0, 10) ?? null,
      };
      staffLeaveSummary = {
        approvedDays: approvedLeaves.reduce((total, leave) => total + leave.netLeaveDays, 0),
        pendingRequests: pendingLeaveCount,
      };
    }
  }

  if (!slipsRes.success || !rosterRes.success || !summaryRes.success) {
    return (
      <DashboardContainer title="Salary management">
        <Alert variant="destructive">
          <AlertTitle>Salary management data could not be loaded</AlertTitle>
          <AlertDescription>
            {(!slipsRes.success && slipsRes.error) ||
              (!rosterRes.success && rosterRes.error) ||
              (!summaryRes.success && summaryRes.error) ||
              "Refresh the page to try again. If the problem continues, contact an administrator."}
          </AlertDescription>
          <Button asChild className="mt-3" size="sm" variant="outline">
            <Link href="/dashboard/salary">Try again</Link>
          </Button>
        </Alert>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer title="Salary Management">
      <SalaryPinGate
        email={user.email}
        isConfigured
        isUnlocked
      >
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 pb-6 font-sans sm:space-y-6">
          <div className="border-b pb-5">
            <p className="text-sm font-medium text-muted-foreground">Payroll workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Salary management</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Configure recurring compensation and review monthly salary slips.
            </p>
          </div>
          <SalaryDashboardHub
            initialUsers={rosterRes.employees}
            initialRoster={{
              page: rosterRes.page,
              pageSize: rosterRes.pageSize,
              totalCount: rosterRes.totalCount,
            }}
            summary={summaryRes.summary}
            initialSlips={slipsRes.slips}
            initialSlipPage={{
              page: slipsRes.page,
              pageSize: slipsRes.pageSize,
              totalCount: slipsRes.totalCount,
              paidYtd: slipsRes.paidYtd,
            }}
            isHrOrAdmin={isHrOrAdmin}
            staffProfile={staffProfile}
            staffLeaveSummary={staffLeaveSummary}
          />
        </div>
      </SalaryPinGate>
    </DashboardContainer>
  );
}
