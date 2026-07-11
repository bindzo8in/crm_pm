import { Metadata } from "next";
import DashboardContainer from "../../dashboard-container";
import { ProposalTermForm } from "@/components/services/terms/form";
import { GetAllActivePackages } from "@/actions/services";
import { requirePageAccess } from "@/lib/auth-guard";

export const metadata: Metadata = {
    title: "Create Terms",
};

export default async function CreateTerms() {
    await requirePageAccess("/dashboard/terms");
    const packagesResponse = await GetAllActivePackages();
    const activePackages = packagesResponse.success && packagesResponse.data ? packagesResponse.data : [];

    return (
        <DashboardContainer title="Create Terms">
            <ProposalTermForm activePackages={activePackages} />
        </DashboardContainer>
    )
}