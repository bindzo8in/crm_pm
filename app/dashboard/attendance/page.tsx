import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTodayAttendanceAction } from "@/actions/attendance";
import { AttendanceClientHub } from "@/components/attendance/attendance-client-hub";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attendance Kiosk & Logs | CRM",
  description: "Track employee shift attendance, selfie verification, and analytics.",
};

export default async function AttendancePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { record, settings, userRole } = await getTodayAttendanceAction();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <AttendanceClientHub
        initialRecord={record}
        settings={settings}
        userRole={userRole}
      />
    </div>
  );
}
