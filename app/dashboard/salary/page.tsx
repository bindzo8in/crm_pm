import { Metadata } from "next";
import { SalaryDashboardHub } from "@/components/salary/salary-dashboard-hub";
import { getSalarySlipsAction } from "@/actions/salary";
import { requireAttendanceAccess } from "@/lib/attendance-guard";
import { UserRole } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Salary Management | CRM",
};

export default async function SalaryDashboardPage() {
  const { user, isAuthorized } = await requireAttendanceAccess();

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Access Restricted
      </div>
    );
  }

  const isHrOrAdmin = 
    user.role === UserRole.SUPER_ADMIN || 
    user.role === UserRole.ADMIN || 
    (user.role === UserRole.STAFF && user.department === 'HR');

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, department: true },
    orderBy: { name: 'asc' }
  });
  const slipsRes = await getSalarySlipsAction({});

  const slips = slipsRes.success ? slipsRes.slips : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Salary Management</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Manage employee salary structures and generate monthly salary slips.
          </p>
        </div>
      </div>

      <SalaryDashboardHub 
        users={users} 
        initialSlips={slips}
        isHrOrAdmin={isHrOrAdmin}
        currentUserId={user.id}
      />
    </div>
  );
}
