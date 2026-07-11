import DashboardContainer from "@/app/dashboard/dashboard-container";
import { AccountProfileForm, AccountPasswordForm } from "@/components/settings/account-profile-form";
import { requirePageAccess } from "@/lib/auth-guard";

export const metadata = {
  title: "Account Settings",
};

export default async function AccountSettingsPage() {
  await requirePageAccess("/dashboard/settings");

  return (
    <DashboardContainer title="Account Settings">
      <div className="flex flex-col gap-6">
        <AccountProfileForm />
        <AccountPasswordForm />
      </div>
    </DashboardContainer>
  );
}
