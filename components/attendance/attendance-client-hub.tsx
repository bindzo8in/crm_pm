"use client";

import { useState } from "react";
import { PunchClockView } from "./punch-clock-view";
import { AttendanceTable } from "./attendance-table";
import { AttendanceAnalytics } from "./attendance-analytics";
import { AttendanceReportView } from "./attendance-report-view";
import { MobileAttendanceNav, AttendanceTab } from "./mobile-attendance-nav";
import { AttendanceSettingsDialog } from "./attendance-settings-dialog";
import { Button } from "@/components/ui/button";
import {
  ClockIcon,
  HistoryIcon,
  BarChart3Icon,
  FileSpreadsheetIcon,
  Settings2Icon,
  ShieldAlertIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkMode } from "@/app/generated/prisma/enums";

interface AttendanceClientHubProps {
  initialRecord: any;
  settings: any;
  dayStatus: {
    isWeekend: boolean;
    weekday: string;
    holidayName: string | null;
  } | null;
  userRole: string;
  userDepartment: string;
  workMode: WorkMode;
}

export function AttendanceClientHub({ initialRecord, settings, dayStatus, userRole, userDepartment, workMode }: AttendanceClientHubProps) {
  const [activeTab, setActiveTab] = useState<AttendanceTab>("kiosk");
  const record = initialRecord;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const isHrStaff = userRole === "STAFF" && userDepartment === "HR";
  const canViewReports = isAdmin || isHrStaff;
  const canManageShiftRules = isAdmin || isHrStaff;
  const needsShiftSetup = !settings?.isConfigured;

  const handleRefresh = async () => {
    window.location.reload();
  };

  return (
    <div className="w-full min-h-screen space-y-6">
      {/* Top Header Bar with Navigation Tabs & Admin Controls */}
      <div className="flex w-full items-center justify-between gap-3">
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

          {isAdmin && (
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
              Analytics Overview
            </button>
          )}

          {canViewReports && (
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                activeTab === "reports"
                  ? "bg-background text-foreground shadow-md text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileSpreadsheetIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Detailed Reports & Export
            </button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Open attendance settings"
          title="Attendance settings"
          className="size-11 shrink-0 rounded-xl"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings2Icon aria-hidden="true" className="size-5 text-primary" />
        </Button>
      </div>

      {canManageShiftRules && needsShiftSetup && (
        <section
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Shift rules need to be set up</h2>
              <p className="text-sm text-muted-foreground">
                Add your organization’s expected shift times and attendance thresholds before relying on attendance calculations.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="shrink-0"
          >
            Open attendance settings
          </Button>
        </section>
      )}

      {/* Main Active Tab Content */}
      <div className="w-full">
        {activeTab === "kiosk" && (
          <PunchClockView
            initialRecord={record}
            settings={settings}
            dayStatus={dayStatus}
            onRefresh={handleRefresh}
            workMode={workMode}
          />
        )}

        {activeTab === "history" && (
          <AttendanceTable userRole={userRole} userDepartment={userDepartment} />
        )}

        {activeTab === "analytics" && isAdmin && (
          <AttendanceAnalytics />
        )}

        {activeTab === "reports" && canViewReports && (
          <AttendanceReportView userRole={userRole} userDepartment={userDepartment} />
        )}
      </div>

      {/* Mobile Bottom Sticky Navigation */}
      <MobileAttendanceNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        canViewReports={canViewReports}
        canViewAnalytics={isAdmin}
      />

      <AttendanceSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        canManageShiftRules={canManageShiftRules}
        canManageReminderTime={isAdmin}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
