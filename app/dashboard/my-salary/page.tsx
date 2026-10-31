import { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { getSalarySlipsAction } from "@/actions/salary";
import { UserRole } from "@/app/generated/prisma/enums";
import { requirePageAccess } from "@/lib/auth-guard";
import prisma from "@/lib/prisma";
import { StaffSalaryWorkspace } from "@/components/salary/staff-salary-workspace";

export const metadata: Metadata = {
  title: "My Salary | CRM",
};

export default async function MySalaryPage() {
  const session = await requirePageAccess("/dashboard/my-salary");
  const currentUserId = session.user.id;
  const [profile, slipsResult, approvedLeaves, pendingLeaveCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        name: true,
        email: true,
        department: true,
        designation: true,
        dateOfJoining: true,
      },
    }),
    getSalarySlipsAction({}),
    prisma.leaveRequest.findMany({
      where: {
        userId: currentUserId,
        status: "APPROVED",
        startDate: { gte: new Date(`${new Date().getFullYear()}-01-01T00:00:00.000Z`) },
      },
      select: { netLeaveDays: true },
    }),
    prisma.leaveRequest.count({
      where: { userId: currentUserId, status: "PENDING" },
    }),
  ]);

  if (!profile || !slipsResult.success) {
    redirect("/dashboard");
  }

  if (
    session.user.role !== UserRole.STAFF ||
    session.user.department === "HR"
  ) {
    redirect("/dashboard/salary");
  }

  return (
    <DashboardContainer title="My Salary">
      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-8 sm:px-6">
        <header className="border-b pb-5">
          <p className="text-sm font-medium text-muted-foreground">Personal payroll</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">My salary</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review your payroll details, approved leave, and salary slips.
          </p>
        </header>
        <StaffSalaryWorkspace
          profile={{
            ...profile,
            dateOfJoining: profile.dateOfJoining?.toISOString().slice(0, 10) ?? null,
          }}
          slips={slipsResult.slips}
          leaveSummary={{
            approvedDays: approvedLeaves.reduce(
              (total, leave) => total + Number(leave.netLeaveDays),
              0,
            ),
            pendingRequests: pendingLeaveCount,
          }}
        />
      </main>
    </DashboardContainer>
  );
}
