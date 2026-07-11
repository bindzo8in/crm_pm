export const metadata = {
  title: "Edit Composer"
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProposalComposer as ComposerComponent } from "@/components/proposal/builder/composer";
import { requirePageAccess } from "@/lib/auth-guard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalComposerPage({ params }: PageProps) {
  await requirePageAccess("/dashboard/proposals");
  const { id } = await params;
  return (
    <DashboardContainer title="Proposal Composer">
      <ComposerComponent proposalId={id} />
    </DashboardContainer>
  );
}
