import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProfileWorkspace } from "@/components/settings/profile-workspace";
import { requirePageAccess } from "@/lib/auth-guard";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Account Settings",
};

export default async function AccountSettingsPage() {
  const session = await requirePageAccess("/dashboard/account");
  const departmentMemberships = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { department: true, additionalDepartments: true },
  });
  if (!departmentMemberships) {
    throw new Error("Account profile could not be loaded.");
  }

  return (
    <DashboardContainer title="Account Settings">
      <ProfileWorkspace
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
          role: session.user.role ?? "",
          department: departmentMemberships.department,
          additionalDepartments: departmentMemberships.additionalDepartments,
          createdAt: session.user.createdAt,
        }}
      />
    </DashboardContainer>
  );
}
