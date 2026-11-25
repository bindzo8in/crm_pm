export const metadata = {
  title: "Organization members"
};

import UsersTable from "./UsersTable";
import DashboardContainer from "../dashboard-container";
import { requirePageAccess } from "@/lib/auth-guard";
import { getOrganizationManagerContext } from "@/lib/organization-manager";

export default async function UsersPage() {
    await requirePageAccess("/dashboard/users");
    const managerContext = await getOrganizationManagerContext();

    return (
        <DashboardContainer title="Organization members">
            <UsersTable canManageOrganization={Boolean(managerContext)} />
        </DashboardContainer>
    )
}