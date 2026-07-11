export const metadata = {
  title: "Edit Builder"
};

import DashboardContainer from "@/app/dashboard/dashboard-container"
import { ProposalPriceBuilder as PriceBuilderComponent } from "@/components/proposal/builder/price";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function ProposalPriceBuilder({ params }: PageProps<'/dashboard/proposals/[id]/builder'>) {
    await requirePageAccess("/dashboard/proposals");
    const { id } = await params
    return (
        <DashboardContainer title={`Proposal Builder`}>
            <PriceBuilderComponent proposalId={id} />
        </DashboardContainer>
    )
}