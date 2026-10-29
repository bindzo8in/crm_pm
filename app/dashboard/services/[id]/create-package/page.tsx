export const metadata = {
  title: "Create Package"
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CreateEditServicePackageForm } from "@/components/services/create-edit-service-package";
import { GetServiceNameById } from "@/actions/services";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function CreateServicePackagePage({ params }: PageProps<'/dashboard/services/[id]/create-package'>) {
    await requirePageAccess("/dashboard/services");
    const { id } = await params
    const service = await GetServiceNameById(id)

    return (
        <DashboardContainer
            title={service.success && service.data ? `Create Service Package for ${service.data.name}` : "Create Service Package"}
            back={{ href: "/dashboard/services/packages", label: "Back to packages" }}>
            <CreateEditServicePackageForm serviceId={id} />
        </DashboardContainer>
    )
}