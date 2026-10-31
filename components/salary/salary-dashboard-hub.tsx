"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { IndianRupee, FileTextIcon, UsersRound, WalletCards, WalletIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SalaryStructuresTab } from "./salary-structures-tab";
import { SalarySlipsTab } from "./salary-slips-tab";
import type { SalaryEmployee, SalarySlipRecord } from "./types";
import { StaffSalaryWorkspace } from "./staff-salary-workspace";

interface SalaryDashboardHubProps {
  users: SalaryEmployee[];
  initialSlips: SalarySlipRecord[];
  isHrOrAdmin: boolean;
  staffProfile?: {
    name: string;
    email: string;
    department: string | null;
    designation: string | null;
    dateOfJoining: string | null;
  };
  staffLeaveSummary?: {
    approvedDays: number;
    pendingRequests: number;
  };
}

export function SalaryDashboardHub({
  users,
  initialSlips,
  isHrOrAdmin,
  staffProfile,
  staffLeaveSummary,
}: SalaryDashboardHubProps) {
  const [activeTab, setActiveTab] = useState<"structures" | "slips">(isHrOrAdmin ? "structures" : "slips");

  if (!isHrOrAdmin && staffProfile && staffLeaveSummary) {
    return (
      <StaffSalaryWorkspace
        profile={staffProfile}
        slips={initialSlips}
        leaveSummary={staffLeaveSummary}
      />
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {isHrOrAdmin && (
        <AdminPayrollSummary users={users} slips={initialSlips} />
      )}
      {isHrOrAdmin && (
        <div
          role="group"
          aria-label="Salary management sections"
          className="grid w-full grid-cols-2 gap-1 rounded-xl border bg-muted/50 p-1 sm:w-fit"
        >
          <button
            type="button"
            onClick={() => setActiveTab("structures")}
            aria-pressed={activeTab === "structures"}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-5",
              activeTab === "structures"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <WalletIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span>Salary structures</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("slips")}
            aria-pressed={activeTab === "slips"}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium sm:flex-none sm:gap-2 sm:px-5 sm:text-sm",
              activeTab === "slips"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileTextIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <span>Salary slips</span>
          </button>
        </div>
      )}

      <div>
        {activeTab === "structures" && isHrOrAdmin && (
          <SalaryStructuresTab users={users} />
        )}

        {activeTab === "slips" && (
          <SalarySlipsTab 
            users={users} 
            initialSlips={initialSlips} 
            isHrOrAdmin={isHrOrAdmin}
          />
        )}
      </div>
    </div>
  );
}

function AdminPayrollSummary({
  users,
  slips,
}: {
  users: SalaryEmployee[];
  slips: SalarySlipRecord[];
}) {
  const latestSlip = [...slips].sort((a, b) => b.year - a.year || b.month - a.month)[0];
  const latestPeriodSlips = latestSlip
    ? slips.filter((slip) => slip.year === latestSlip.year && slip.month === latestSlip.month)
    : [];
  const monthlyTotal = latestPeriodSlips.reduce((total, slip) => total + Number(slip.netSalary), 0);
  const paidCount = latestPeriodSlips.filter((slip) => slip.status === "PAID").length;
  const configuredCount = users.filter((user) => user.hasSalaryStructure).length;
  const periodLabel = latestSlip
    ? new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(2000, latestSlip.month - 1, 1))
    : "No payroll yet";

  const items = [
    { label: "Monthly payroll", value: monthlyTotal ? `₹${monthlyTotal.toLocaleString("en-IN")}` : "₹0", detail: periodLabel, icon: IndianRupee },
    { label: "Configured staff", value: `${configuredCount}/${users.length}`, detail: "Salary profiles ready", icon: WalletCards },
    { label: "Paid slips", value: `${paidCount}/${latestPeriodSlips.length}`, detail: periodLabel, icon: FileTextIcon },
    { label: "Employees", value: String(users.length), detail: "In payroll directory", icon: UsersRound },
  ];

  return (
    <section aria-label="Payroll summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="min-w-0 p-3.5 sm:p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <item.icon className="size-4" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 truncate text-lg font-semibold sm:text-xl">{item.value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</p>
        </Card>
      ))}
    </section>
  );
}
