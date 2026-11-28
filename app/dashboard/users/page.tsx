export const metadata = {
  title: "Users"
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
        <DashboardContainer title="Users">
            <UsersTable
                canManageOrganization={Boolean(managerContext)}
                canAssignWorkMode={canAssignWorkMode}
            />
        </DashboardContainer>
    )
}