"use client";

import { useState } from "react";
import { PunchClockView } from "./punch-clock-view";
import { AttendanceTable } from "./attendance-table";
import { AttendanceAnalytics } from "./attendance-analytics";
import { AttendanceReportView } from "./attendance-report-view";
import { MobileAttendanceNav, AttendanceTab } from "./mobile-attendance-nav";
import { AttendanceSettingsDialog } from "./attendance-settings-dialog";
import { AttendanceBrowserReminders } from "./attendance-browser-reminders";
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
  userRole: string;
  userDepartment: string;
  workMode: WorkMode;
}

export function AttendanceClientHub({ initialRecord, settings, userRole, userDepartment, workMode }: AttendanceClientHubProps) {
  const [activeTab, setActiveTab] = useState<AttendanceTab>("kiosk");
  const [record, setRecord] = useState(initialRecord);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";
  const isHrStaff = userRole === "STAFF" && userDepartment === "HR";
  const isManager = isAdmin || userDepartment === "HR";
  const canManageShiftRules = isAdmin || isHrStaff;
  const needsShiftSetup = !settings?.isConfigured;

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
            Analytics Overview
          </button>

          {canManageShiftRules && (
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

        {/* Admin Shift Rules Settings Button */}
        {isManager && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-2xl border-border/80 text-xs font-semibold shadow-sm"
          >
            <Settings2Icon className="w-4 h-4 mr-1.5 text-primary" />
            {needsShiftSetup ? "Set up shift rules" : "Shift Rules"}
          </Button>
        )}
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
            Fill shift rules
          </Button>
        </section>
      )}

      <AttendanceBrowserReminders />

      {/* Main Active Tab Content */}
      <div className="w-full">
        {activeTab === "kiosk" && (
          <PunchClockView
            initialRecord={record}
            settings={settings}
            onRefresh={handleRefresh}
            workMode={workMode}
          />
        )}

        {activeTab === "history" && (
          <AttendanceTable userRole={userRole} userDepartment={userDepartment} />
        )}

        {activeTab === "analytics" && (
          <AttendanceAnalytics />
        )}

        {activeTab === "reports" && isManager && (
          <AttendanceReportView userRole={userRole} userDepartment={userDepartment} />
        )}
      </div>

      {/* Mobile Bottom Sticky Navigation */}
      <MobileAttendanceNav activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)} isManager={isManager} />

      {/* Admin Settings Dialog */}
      {canManageShiftRules && (
        <AttendanceSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          canManageReminderTime={isAdmin}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
