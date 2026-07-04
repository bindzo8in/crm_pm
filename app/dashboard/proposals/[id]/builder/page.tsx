export const metadata = {
  title: "Edit Builder"
};

import DashboardContainer from "@/app/dashboard/dashboard-container"
import { ProposalPriceBuilder as PriceBuilderComponent } from "@/components/proposal/builder/price";

export default async function ProposalPriceBuilder({ params }: PageProps<'/dashboard/proposals/[id]/builder'>) {
    const { id } = await params
    return (
        <DashboardContainer title={`Proposal Builder`}>
            <PriceBuilderComponent proposalId={id} />
        </DashboardContainer>
    )
}