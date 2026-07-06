export const metadata = {
  title: "Edit Package"
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { CreateEditServicePackageForm } from "@/components/services/create-edit-service-package";
import { GetServiceNameById, getServicePackage } from "@/actions/services";
import { ArrowLeft } from "lucide-react";

export default async function EditServicePackagePage({ params, searchParams }: PageProps<'/dashboard/services/[id]/edit-package'>) {
    const { id } = await params
    const { packageId } = await searchParams

    const service = await GetServiceNameById(id)
    const servicePackage = await getServicePackage(packageId as string)
    console.log(servicePackage)
    return (
        <DashboardContainer
            title={service.success && service.data ? `Edit Service Package for ${service.data.name}` : "Edit Service Package"}
            action={{
                href: "/dashboard/services",
                label: "Back",
                icon: <ArrowLeft />
            }}>
            <CreateEditServicePackageForm serviceId={id} defaultValues={servicePackage.success ? servicePackage.data : undefined}/>
        </DashboardContainer>
    )
}