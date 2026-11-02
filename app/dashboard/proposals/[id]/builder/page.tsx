export const metadata = {
  title: "Edit Builder"
};

import DashboardContainer from "@/app/dashboard/dashboard-container"
import { ProposalPriceBuilder as PriceBuilderComponent } from "@/components/proposal/builder/price";
import { requirePageAccess } from "@/lib/auth-guard";
import { getProposalWorkflowValidation } from "@/lib/proposal-workflow-validation";
import { ProposalStepGate } from "@/components/proposal/proposal-step-gate";

export default async function ProposalPriceBuilder({ params }: PageProps<'/dashboard/proposals/[id]/builder'>) {
    await requirePageAccess("/dashboard/proposals");
    const { id } = await params
    const validation = await getProposalWorkflowValidation(id);
    if (!validation) {
        return (
            <DashboardContainer title="Proposal pricing" back={{ href: "/dashboard/proposals", label: "Back to proposals" }}>
                <ProposalStepGate
                    title="Proposal not found"
                    description="This proposal may have been removed."
                    href="/dashboard/proposals"
                    action="Back to proposals"
                />
            </DashboardContainer>
        );
    }
    if (validation.status === "DRAFT" && !validation.detailsValid) {
        return (
            <DashboardContainer title="Proposal pricing" back={{ href: `/dashboard/proposals/${id}/edit`, label: "Back to proposal details" }}>
                <ProposalStepGate
                    title="Complete proposal details first"
                    description="Add a customer and proposal title before starting pricing."
                    href={`/dashboard/proposals/${id}/edit`}
                    action="Complete details"
                />
            </DashboardContainer>
        );
    }
    return (
        <DashboardContainer title="Proposal pricing" back={{ href: `/dashboard/proposals/${id}/edit`, label: "Back to proposal details" }}>
            <PriceBuilderComponent proposalId={id} />
        </DashboardContainer>
    )
}