"use client";

import React, { useState } from "react";
import { PunchClockView } from "./punch-clock-view";
import { AttendanceTable } from "./attendance-table";
import { AttendanceAnalytics } from "./attendance-analytics";
import { MobileAttendanceNav, AttendanceTab } from "./mobile-attendance-nav";
import { AttendanceSettingsDialog } from "./attendance-settings-dialog";
import { Button } from "@/components/ui/button";
import { ClockIcon, HistoryIcon, BarChart3Icon, Settings2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceClientHubProps {
  initialRecord: any;
  settings: any;
  userRole: string;
}

export function AttendanceClientHub({ initialRecord, settings, userRole }: AttendanceClientHubProps) {
  const [activeTab, setActiveTab] = useState<AttendanceTab>("kiosk");
  const [record, setRecord] = useState(initialRecord);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <div className="w-full min-h-screen space-y-6">
      {/* Top Header Bar with Navigation Tabs & Admin Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Desktop Navigation Tabs */}
        <div className="hidden md:flex items-center gap-2 p-1.5 bg-muted/50 rounded-2xl w-fit border border-border/60 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("kiosk")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeTab === "kiosk"
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ClockIcon className="w-4 h-4 text-primary" />
            Punch Clock
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeTab === "history"
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HistoryIcon className="w-4 h-4 text-primary" />
            Attendance Logs
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeTab === "analytics"
                ? "bg-background text-foreground shadow-md"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3Icon className="w-4 h-4 text-primary" />
            Analytics & Reports
          </button>
        </div>

        {/* Admin Shift Rules Settings Button */}
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-2xl border-border/80 text-xs font-semibold shadow-sm"
          >
            <Settings2Icon className="w-4 h-4 mr-1.5 text-primary" /> Shift Rules
          </Button>
        )}
      </div>

      {/* Main Active Tab Content */}
      <div className="w-full">
        {activeTab === "kiosk" && (
          <PunchClockView
            initialRecord={record}
            settings={settings}
            onRefresh={handleRefresh}
          />
        )}

        {activeTab === "history" && (
          <AttendanceTable userRole={userRole} />
        )}

        {activeTab === "analytics" && (
          <AttendanceAnalytics />
        )}
      </div>

      {/* Mobile Bottom Sticky Navigation */}
      <MobileAttendanceNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} />

      {/* Admin Settings Dialog */}
      {isAdmin && (
        <AttendanceSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
