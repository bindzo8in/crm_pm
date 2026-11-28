import { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAttendanceAccess } from "@/lib/attendance-guard";
import { getWeekendDays } from "@/services/attendance-settings-service";
import DashboardContainer from "../../dashboard-container";
import { WeeklyScheduleSettings } from "./weekly-schedule-settings";

export const metadata: Metadata = {
  title: "Work schedule | CRM",
};

export default async function WorkSchedulePage() {
  const { isAuthorized, session } = await requireAttendanceAccess("manage");
  if (!isAuthorized) redirect("/attendance");
  const organizationId = session.session.activeOrganizationId;
  if (!organizationId) redirect("/organization");

  const weekendDays = await getWeekendDays(organizationId);
  return (
    <DashboardContainer title="Work schedule">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Weekly work schedule
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Set the days your team normally does not work. This schedule is used
            when calculating leave days and preparing attendance reports.
          </p>
        </header>
        <WeeklyScheduleSettings
          isManager
          weekendDays={weekendDays}
        />
      </div>
    </DashboardContainer>
  );
}
