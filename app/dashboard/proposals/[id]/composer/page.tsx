export const metadata = {
  title: "Edit Composer"
};

import DashboardContainer from "@/app/dashboard/dashboard-container";
import { ProposalComposer as ComposerComponent } from "@/components/proposal/builder/composer";
import { requirePageAccess } from "@/lib/auth-guard";
import { getProposalWorkflowValidation } from "@/lib/proposal-workflow-validation";
import { ProposalStepGate } from "@/components/proposal/proposal-step-gate";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalComposerPage({ params }: PageProps) {
  await requirePageAccess("/dashboard/proposals");
  const { id } = await params;
  const validation = await getProposalWorkflowValidation(id);
  if (!validation) {
    return (
      <DashboardContainer title="Proposal document" back={{ href: "/dashboard/proposals", label: "Back to proposals" }}>
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
      <DashboardContainer title="Proposal document" back={{ href: `/dashboard/proposals/${id}/edit`, label: "Back to proposal details" }}>
        <ProposalStepGate
          title="Complete proposal details first"
          description="Add a customer and proposal title before building the document."
          href={`/dashboard/proposals/${id}/edit`}
          action="Complete details"
        />
      </DashboardContainer>
    );
  }
  if (validation.status === "DRAFT" && !validation.pricingValid) {
    return (
      <DashboardContainer title="Proposal document" back={{ href: `/dashboard/proposals/${id}/builder`, label: "Back to pricing" }}>
        <ProposalStepGate
          title="Complete pricing before Step 3"
          description={validation.pricingMessage ?? "Add at least one priced line item before building the document."}
          href={`/dashboard/proposals/${id}/builder`}
          action="Add proposal pricing"
        />
      </DashboardContainer>
    );
  }
  return (
    <DashboardContainer title="Proposal document" back={{ href: `/dashboard/proposals/${id}/builder`, label: "Back to pricing" }}>
      <ComposerComponent proposalId={id} />
    </DashboardContainer>
  );
}
