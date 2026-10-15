import { Metadata } from "next";
import { SalaryDashboardHub } from "@/components/salary/salary-dashboard-hub";
import { getSalarySlipsAction } from "@/actions/salary";
import { requirePageAccess } from "@/lib/auth-guard";
import { UserRole } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import DashboardContainer from "@/app/dashboard/dashboard-container";

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

  const users = isHrOrAdmin
    ? (
        await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            salaryStructure: { select: { id: true } },
          },
          orderBy: { name: "asc" },
        })
      ).map(({ salaryStructure, ...employee }) => ({
        ...employee,
        hasSalaryStructure: salaryStructure !== null,
      }))
    : [];
  const slipsRes = await getSalarySlipsAction({});

  if (!slipsRes.success) {
    throw new Error(slipsRes.error || "Failed to load salary slips.");
  }

  return (
    <DashboardContainer title="Salary Management">
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-4 pb-6 font-sans sm:px-6 md:px-8">
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          Manage employee salary structures and generate monthly salary slips.
        </p>
        <SalaryDashboardHub
          users={users}
          initialSlips={slipsRes.slips}
          isHrOrAdmin={isHrOrAdmin}
        />
      </div>
    </DashboardContainer>
  );
}
