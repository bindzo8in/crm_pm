"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Download, Eye, FileText, IndianRupee, Palmtree, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { SalarySlipRecord } from "./types";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type StaffProfile = {
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  dateOfJoining: string | null;
};

type StaffLeaveSummary = {
  approvedDays: number;
  pendingRequests: number;
};

interface StaffSalaryWorkspaceProps {
  profile: StaffProfile;
  slips: SalarySlipRecord[];
  leaveSummary: StaffLeaveSummary;
}

export function StaffSalaryWorkspace({
  profile,
  slips,
  leaveSummary,
}: StaffSalaryWorkspaceProps) {
  const currentYear = new Date().getFullYear();
  const paidYtd = slips
    .filter((slip) => slip.status === "PAID" && slip.year === currentYear)
    .reduce((total, slip) => total + Number(slip.netSalary), 0);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {profile.name.trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{profile.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{profile.designation || profile.department || "Employee"}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Department</dt>
            <dd className="mt-1 text-sm font-medium">{profile.department || "Not assigned"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date of joining</dt>
            <dd className="mt-1 text-sm font-medium">
              {profile.dateOfJoining || "Not recorded"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-1 break-all text-sm font-medium">{profile.email}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Payroll summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<FileText className="size-4" />}
          label="Salary slips"
          value={String(slips.length)}
          detail="Available records"
        />
        <SummaryCard
          icon={<IndianRupee className="size-4" />}
          label="Paid this year"
          value={formatCurrency(paidYtd)}
          detail={`${currentYear} payroll`}
        />
        <SummaryCard
          icon={<Palmtree className="size-4" />}
          label="Leave taken"
          value={`${leaveSummary.approvedDays} days`}
          detail={`${currentYear} approved`}
        />
        <SummaryCard
          icon={<CalendarDays className="size-4" />}
          label="Leave requests"
          value={String(leaveSummary.pendingRequests)}
          detail="Awaiting approval"
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">My salary slips</h2>
          <p className="text-sm text-muted-foreground">View and download your payroll records.</p>
        </div>

        {slips.length === 0 ? (
          <Card className="flex flex-col items-center px-6 py-12 text-center">
            <FileText className="size-6 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No salary slips yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Your generated salary slips will appear here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {[...slips]
              .sort((a, b) => b.year - a.year || b.month - a.month)
              .map((slip) => (
                <Card key={slip.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {months[slip.month - 1]} {slip.year}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Attendance: {slip.paidDays} of {slip.totalDays} paid days
                      </p>
                    </div>
                    <StatusBadge status={slip.status} />
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3 border-t pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Net payable</p>
                      <p className="mt-1 text-xl font-semibold text-primary">
                        {formatCurrency(Number(slip.netSalary))}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="size-11" asChild>
                        <Link href={`/s/${slip.id}`} target="_blank" aria-label={`View ${months[slip.month - 1]} salary slip`}>
                          <Eye className="size-4" />
                        </Link>
                      </Button>
                      <Button size="icon" className="size-11" asChild>
                        <a href={`/api/salary/slips/${slip.id}/pdf`} target="_blank" rel="noreferrer" aria-label={`Download ${months[slip.month - 1]} salary slip`}>
                          <Download className="size-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="min-w-0 p-3.5 sm:p-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="mt-4 truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold sm:text-xl">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: SalarySlipRecord["status"] }) {
  return (
    <Badge
      variant="outline"
      className={
        status === "PAID"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : status === "GENERATED"
            ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      }
    >
      {status}
    </Badge>
  );
}
