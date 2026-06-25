import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ServiceForm } from "@/components/services/create-edit";
import { ArrowLeft } from "lucide-react";
import { GetService } from "@/actions/services";

export default async function EditServicePage({ params }: PageProps<'/dashboard/services/[id]/edit'>) {
    const { id } = await params
    const service = await GetService(id)
    return (
        <DashboardContainer title="Edit Service" action={{
            href: "/dashboard/services",
            label: "Back",
            icon: <ArrowLeft className="size-4" />
        }}>
            <ServiceForm service={service.data} />
        </DashboardContainer>
    )
}