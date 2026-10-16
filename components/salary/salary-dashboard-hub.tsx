"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { WalletIcon, FileTextIcon } from "lucide-react";
import { SalaryStructuresTab } from "./salary-structures-tab";
import { SalarySlipsTab } from "./salary-slips-tab";
import type { SalaryEmployee, SalarySlipRecord } from "./types";

interface SalaryDashboardHubProps {
  users: SalaryEmployee[];
  initialSlips: SalarySlipRecord[];
  isHrOrAdmin: boolean;
}

export function SalaryDashboardHub({ users, initialSlips, isHrOrAdmin }: SalaryDashboardHubProps) {
  const [activeTab, setActiveTab] = useState<"structures" | "slips">(isHrOrAdmin ? "structures" : "slips");

  return (
    <div className="w-full min-w-0 space-y-6">
      {isHrOrAdmin && (
        <div
          role="group"
          aria-label="Salary management sections"
          className="flex w-full max-w-full flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-muted/50 p-1 sm:w-fit"
        >
          <button
            type="button"
            onClick={() => setActiveTab("structures")}
            aria-pressed={activeTab === "structures"}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium sm:flex-none sm:gap-2 sm:px-5 sm:text-sm",
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
