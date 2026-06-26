import { Metadata } from "next";
import DashboardContainer from "../../dashboard-container";
import { ProposalTermForm } from "@/components/services/terms/form";
import { GetAllActiveServices } from "@/actions/services";

export const metadata: Metadata = {
    title: "Create Terms",
};

export default async function CreateTerms() {
    const servicesResponse = await GetAllActiveServices();
    const activeServices = servicesResponse.success && servicesResponse.data ? servicesResponse.data : [];

    return (
        <DashboardContainer title="Create Terms">
            <ProposalTermForm activeServices={activeServices} />
        </DashboardContainer>
    )
}