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

  let record = null;
  let settings = null;
  let userRole = (session.user.role as string) || "STAFF";

  try {
    const res = await getTodayAttendanceAction();
    record = res.record;
    settings = res.settings;
    userRole = res.userRole;
  } catch (error) {
    console.error("Failed to load today's attendance record:", error);
  }

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
