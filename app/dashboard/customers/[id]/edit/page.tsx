export const metadata = {
    title: "Edit Customers"
};

import { GetCustomer } from "@/actions/customer";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CustomerForm } from "@/components/customers/create-edit";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function UpdateCustomerPage({ params }: PageProps<"/dashboard/customers/[id]/edit">) {
    await requirePageAccess("/dashboard/customers");
    const { id } = await params;

    const { customer, error, message } = await GetCustomer(id);

    return (
        <DashboardContainer title="Update Customer">
            <CustomerForm defaultValues={customer || undefined} error={error ? message : undefined} />
        </DashboardContainer>
    )
}