export const metadata = {
  title: "Create Services"
};

import { ServiceForm } from "@/components/services/create-edit";
import DashboardContainer from "../../dashboard-container";
import { ArrowLeft } from "lucide-react";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function CreateServicePage() {
    await requirePageAccess("/dashboard/services");

    return (
        <DashboardContainer title="Create Service" action={{
            href: "/dashboard/services",
            label: "Back",
            icon: <ArrowLeft className="size-4" />
        }}>
            <ServiceForm />
        </DashboardContainer>
    )
}