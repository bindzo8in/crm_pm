export const metadata = {
  title: "Organization members"
};

import UsersTable from "./UsersTable";
import DashboardContainer from "../dashboard-container";
import { requirePageAccess } from "@/lib/auth-guard";
import { getOrganizationManagerContext } from "@/lib/organization-manager";
import { hasOrganizationPermission } from "@/lib/organization-authorization";

export default async function UsersPage() {
    await requirePageAccess("/dashboard/users");
    const [managerContext, canAssignWorkMode] = await Promise.all([
        getOrganizationManagerContext(),
        hasOrganizationPermission("users", "update"),
    ]);

    return (
        <DashboardContainer title="Organization members">
            <UsersTable canManageOrganization={Boolean(managerContext)} />
        </DashboardContainer>
    )
}