"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { IndianRupee, FileTextIcon, UsersRound, WalletCards, WalletIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SalaryStructuresTab } from "./salary-structures-tab";
import { SalarySlipsTab } from "./salary-slips-tab";
import type {
  SalaryEmployee,
  SalaryManagementSummary,
  SalaryRosterPageInfo,
  SalarySlipPageInfo,
  SalarySlipRecord,
} from "./types";
import { StaffSalaryWorkspace } from "./staff-salary-workspace";

interface SalaryDashboardHubProps {
  initialUsers: SalaryEmployee[];
  initialRoster: SalaryRosterPageInfo;
  summary: SalaryManagementSummary;
  initialSlips: SalarySlipRecord[];
  initialSlipPage: SalarySlipPageInfo;
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
  initialUsers,
  initialRoster,
  summary,
  initialSlips,
  initialSlipPage,
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
        slipPage={initialSlipPage}
        leaveSummary={staffLeaveSummary}
      />
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {isHrOrAdmin && (
        <AdminPayrollSummary summary={summary} />
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
          <SalaryStructuresTab
            initialUsers={initialUsers}
            initialPage={initialRoster}
            summary={summary}
          />
        )}

        {activeTab === "slips" && (
          <SalarySlipsTab 
            initialSlips={initialSlips} 
            initialPage={initialSlipPage}
            isHrOrAdmin={isHrOrAdmin}
          />
        )}
      </div>
    </div>
  );
}

function AdminPayrollSummary({
  summary,
}: {
  summary: SalaryManagementSummary;
}) {
  const periodLabel = summary.latestMonth
    ? new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
        new Date(Date.UTC(2000, summary.latestMonth - 1, 1)),
      )
    : "No payroll yet";

  const items = [
    { label: "Monthly payroll", value: `₹${Number(summary.monthlyTotal).toLocaleString("en-IN")}`, detail: periodLabel, icon: IndianRupee },
    { label: "Configured staff", value: `${summary.configuredCount}/${summary.includedCount}`, detail: "Included payroll profiles", icon: WalletCards },
    { label: "Paid slips", value: `${summary.paidCount}/${summary.slipCount}`, detail: periodLabel, icon: FileTextIcon },
    { label: "Employees", value: String(summary.includedCount), detail: `${summary.excludedCount} excluded from payroll`, icon: UsersRound },
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
