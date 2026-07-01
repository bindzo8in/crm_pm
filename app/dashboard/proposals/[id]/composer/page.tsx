import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProposalComposer as ComposerComponent } from "@/components/proposal/builder/composer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalComposerPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <DashboardContainer title="Proposal Composer">
      <ComposerComponent proposalId={id} />
    </DashboardContainer>
  );
}
