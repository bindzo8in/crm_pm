import { getProposalComposerData } from "@/actions/proposal-composer";
import { ProposalRenderer } from "@/components/proposal/renderer/ProposalRenderer";
import { PreviewToolbar } from "@/components/proposal/preview/PreviewToolbar";
import { AcceptProposalButton } from "@/components/proposal/preview/AcceptProposalButton";

export const metadata = {
  title: "Proposal Preview",
};

interface ProposalPreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalPreviewPage({ params }: ProposalPreviewPageProps) {
  const { id } = await params;
  
  // Reuse composer data fetcher which returns precisely { proposal, blocks }
  const res = await getProposalComposerData(id);

  if (!res.success || !res.data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
        <p>Proposal not found or you lack permission to view it.</p>
      </div>
    );
  }

  const { proposal, blocks } = res.data;

  return (
    <div className="min-h-screen bg-gray-200/50 flex flex-col">
      <PreviewToolbar proposalId={proposal.id} />
      
      <main className="flex-1 overflow-auto py-8">
        <div id="proposal-preview-wrapper" className="transition-transform duration-200 ease-out pb-16">
          <ProposalRenderer proposal={proposal} blocks={blocks} />
          
          <AcceptProposalButton 
            proposalId={proposal.id} 
            currentStatus={proposal.status} 
          />
        </div>
      </main>
    </div>
  );
}
