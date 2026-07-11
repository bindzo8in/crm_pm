export const metadata = {
  title: "Edit Services"
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ServiceForm } from "@/components/services/create-edit";
import { ArrowLeft } from "lucide-react";
import { GetService } from "@/actions/services";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function EditServicePage({ params }: PageProps<'/dashboard/services/[id]/edit'>) {
    await requirePageAccess("/dashboard/services");
    const { id } = await params
    const service = await GetService(id)
    return (
        <DashboardContainer title="Edit Service" action={{
            href: "/dashboard/services",
            label: "Back",
            icon: <ArrowLeft className="size-4" />
        }}>
            <ServiceForm service={service.success ? service.data : undefined} />
        </DashboardContainer>
    )
}