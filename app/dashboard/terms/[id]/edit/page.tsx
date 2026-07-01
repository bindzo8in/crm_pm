import { Metadata } from "next";

import { ProposalTermForm } from "@/components/services/terms/form";
import { GetAllActiveServices } from "@/actions/services";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { GetTerm } from "@/actions/terms";

export const metadata: Metadata = {
    title: "Edit Terms",
};

export default async function EditTerms({ params }: PageProps<'/dashboard/terms/[id]/edit'>) {
    const { id } = await params;
    const termResponse = await GetTerm(id);

    const term = termResponse.success && termResponse.data ? termResponse.data : undefined;

    const servicesResponse = await GetAllActiveServices();
    const activeServices = servicesResponse.success && servicesResponse.data ? servicesResponse.data : [];

    return (
        <DashboardContainer title="Edit Terms">
            <ProposalTermForm initialData={term} activeServices={activeServices} />
        </DashboardContainer>
    )
}