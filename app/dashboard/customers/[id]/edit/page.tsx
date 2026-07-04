export const metadata = {
  title: "Edit Customers"
};

import { GetCustomer } from "@/actions/customer";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CustomerForm } from "@/components/customers/create-edit";

export default async function UpdateCustomerPage({ params }: PageProps<"/dashboard/customers/[id]/edit">) {
    const { id } = await params;

    const { customer, error, message } = await GetCustomer(id);


    return (
        <DashboardContainer title="Update Customer">
            <CustomerForm defaultValues={customer || undefined} error={error ? message : undefined} />
        </DashboardContainer>
    )
}