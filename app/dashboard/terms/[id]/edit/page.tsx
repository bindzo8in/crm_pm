import { Metadata } from "next";

import { ProposalTermForm } from "@/components/services/terms/form";
import { GetAllActivePackages } from "@/actions/services";
import DashboardContainer from "@/app/dashboard/dashboard-container";
import { GetTerm } from "@/actions/terms";
import { requirePageAccess } from "@/lib/auth-guard";

export const metadata: Metadata = {
    title: "Edit Terms",
};

export default async function EditTerms({ params }: PageProps<'/dashboard/terms/[id]/edit'>) {
    await requirePageAccess("/dashboard/terms");
    const { id } = await params;
    const termResponse = await GetTerm(id);

    const term = termResponse.success && termResponse.data ? termResponse.data : undefined;

    const packagesResponse = await GetAllActivePackages();
    const activePackages = packagesResponse.success && packagesResponse.data ? packagesResponse.data : [];

    return (
        <DashboardContainer title="Edit Terms">
            <ProposalTermForm initialData={term} activePackages={activePackages} />
        </DashboardContainer>
    )
}