export const metadata = {
  title: "Create Services"
};

import { ServiceForm } from "@/components/services/create-edit";
import DashboardContainer from "../../dashboard-container";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function CreateServicePage() {
    await requirePageAccess("/dashboard/services");

    return (
        <DashboardContainer
            title="Create Service"
            back={{ href: "/dashboard/services", label: "Back to services" }}
            flush
        >
            <ServiceForm />
        </DashboardContainer>
    )
}