import { AccountPasswordForm, AccountProfileForm } from "@/components/settings/account-profile-form";
import {
  ProfileOverviewCard,
  type ProfileOverviewUser,
} from "@/components/settings/profile-overview-card";

export function ProfileWorkspace({
  user,
  showAttendanceAccess = false,
  showLogoutButton = true,
}: {
  user: ProfileOverviewUser;
  showAttendanceAccess?: boolean;
  showLogoutButton?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      <ProfileOverviewCard user={user} showAttendanceAccess={showAttendanceAccess} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] sm:gap-6">
        <AccountProfileForm showLogoutButton={showLogoutButton} />
        <AccountPasswordForm />
      </div>
    </div>
  );
}
