export const metadata = {
  title: "Users"
};

import UsersTable from "./UsersTable";
import DashboardContainer from "../dashboard-container";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function UsersPage() {
    await requirePageAccess("/dashboard/users");

    return (
        <DashboardContainer title="Users">
            <UsersTable />
        </DashboardContainer>
    )
}