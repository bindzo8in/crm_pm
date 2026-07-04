export const metadata = {
  title: "Create Customers"
};

import { CustomerForm } from "@/components/customers/create-edit"
import DashboardContainer from "../../dashboard-container"

export default function Page() {

    return (
        <DashboardContainer title="Create Customer">
            <CustomerForm />
        </DashboardContainer>
    )
}
