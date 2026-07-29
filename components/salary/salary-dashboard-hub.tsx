"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WalletIcon, FileTextIcon } from "lucide-react";
import { SalaryStructuresTab } from "./salary-structures-tab";
import { SalarySlipsTab } from "./salary-slips-tab";

interface SalaryDashboardHubProps {
  users: any[];
  initialSlips: any[];
  isHrOrAdmin: boolean;
  currentUserId: string;
}

export function SalaryDashboardHub({ users, initialSlips, isHrOrAdmin, currentUserId }: SalaryDashboardHubProps) {
  const [activeTab, setActiveTab] = useState<"structures" | "slips">(isHrOrAdmin ? "structures" : "slips");

  return (
    <div className="space-y-6">
      {isHrOrAdmin && (
        <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-2xl w-fit border border-border/60 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("structures")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeTab === "structures"
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <WalletIcon className="w-4 h-4 text-primary" />
            Salary Structures
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("slips")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeTab === "slips"
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileTextIcon className="w-4 h-4 text-primary" />
            Salary Slips
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
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}
