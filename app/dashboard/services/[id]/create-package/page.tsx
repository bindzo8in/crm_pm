export const metadata = {
  title: "Create Package"
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CreateEditServicePackageForm } from "@/components/services/create-edit-service-package";
import { GetServiceNameById } from "@/actions/services";
import { ArrowLeft } from "lucide-react";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function CreateServicePackagePage({ params }: PageProps<'/dashboard/services/[id]/create-package'>) {
    await requirePageAccess("/dashboard/services");
    const { id } = await params
    const service = await GetServiceNameById(id)

    return (
        <DashboardContainer
            title={service.success && service.data ? `Create Service Package for ${service.data.name}` : "Create Service Package"}
            action={{
                href: "/dashboard/services",
                label: "Back",
                icon: <ArrowLeft />
            }}>
            <CreateEditServicePackageForm serviceId={id} />
        </DashboardContainer>
    )
}