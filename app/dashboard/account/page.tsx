import DashboardContainer from "@/app/dashboard/dashboard-container";
import { AccountProfileForm, AccountPasswordForm } from "@/components/settings/account-profile-form";
import { requirePageAccess } from "@/lib/auth-guard";

export const metadata = {
  title: "Account Settings",
};

export default async function AccountSettingsPage() {
  const session = await requirePageAccess("/dashboard/account");

  return (
    <DashboardContainer title="Account Settings">
      <div className="flex flex-col gap-6">
        <AccountProfileForm
          role={session.user.role}
          department={session.user.department}
        />
        <AccountPasswordForm />
      </div>
    </DashboardContainer>
  );
}
