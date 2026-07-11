export const metadata = {
  title: "Create Customers"
};

import { CustomerForm } from "@/components/customers/create-edit"
import DashboardContainer from "../../dashboard-container"
import { requirePageAccess } from "@/lib/auth-guard"

export default async function Page() {
    await requirePageAccess("/dashboard/customers")

    return (
        <DashboardContainer title="Create Customer">
            <CustomerForm />
        </DashboardContainer>
    )
}
