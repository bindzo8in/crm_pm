import { Metadata } from "next";
import { SalaryDashboardHub } from "@/components/salary/salary-dashboard-hub";
import { getSalarySlipsAction } from "@/actions/salary";
import { requirePageAccess } from "@/lib/auth-guard";
import { UserRole } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Salary Management | CRM",
};

type PayrollPaymentMethod = "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CASH" | "OTHER";

function getPayrollPaymentMethod(method: string): PayrollPaymentMethod {
  switch (method) {
    case "UPI":
    case "CHEQUE":
    case "CASH":
    case "OTHER":
      return method;
    default:
      return "BANK_TRANSFER";
  }
}

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
            designation: true,
            dateOfJoining: true,
            employmentType: true,
            annualCtc: true,
            bankName: true,
            bankAccountNo: true,
            bankIfsc: true,
            bankAccountType: true,
            panNo: true,
            aadhaarNo: true,
            costCenter: true,
            uanNo: true,
            pfNo: true,
            esiNo: true,
            pfEligible: true,
            esiEligible: true,
            taxRegime: true,
            paymentMethod: true,
          },
          orderBy: { name: "asc" },
        })
      ).map(({ salaryStructure, ...employee }) => ({
        ...employee,
        hasSalaryStructure: salaryStructure !== null,
        annualCtc: employee.annualCtc?.toString() ?? null,
        paymentMethod: getPayrollPaymentMethod(employee.paymentMethod),
      }))
    : [];
  const slipsRes = await getSalarySlipsAction({});
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

  if (!slipsRes.success) {
    return (
      <DashboardContainer title="Salary management">
        <Alert variant="destructive">
          <AlertTitle>Salary slips could not be loaded</AlertTitle>
          <AlertDescription>
            Refresh the page to try again. If the problem continues, contact an administrator.
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
      <div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 pb-6 font-sans sm:space-y-6">
        <div className="border-b pb-5">
          <p className="text-sm font-medium text-muted-foreground">Payroll workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Salary management</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Configure recurring compensation and review monthly salary slips.
          </p>
        </div>
        <SalaryDashboardHub
          users={users}
          initialSlips={slipsRes.slips}
          isHrOrAdmin={isHrOrAdmin}
          staffProfile={staffProfile}
          staffLeaveSummary={staffLeaveSummary}
        />
      </div>
    </DashboardContainer>
  );
}
