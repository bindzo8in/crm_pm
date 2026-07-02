import { getProposalComposerData } from "@/actions/proposal-composer";
import { ProposalRenderer } from "@/components/proposal/renderer/ProposalRenderer";
import { PreviewToolbar } from "@/components/proposal/preview/PreviewToolbar";
import { AcceptProposalButton } from "@/components/proposal/preview/AcceptProposalButton";
import prisma from "@/lib/prisma";

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

  // Fetch Company and associated Bank Account for PDF generation
  const company = await prisma.company.findFirst();
  let bankAccount = null;

  const propAny = proposal as any;
  if (propAny.bankAccountId) {
    bankAccount = await prisma.companyBankAccount.findUnique({
      where: { id: propAny.bankAccountId },
    });
  } else if (company) {
    // Fallback to default if no specific account selected
    bankAccount = await prisma.companyBankAccount.findFirst({
      where: { companyId: company.id, isDefault: true, isActive: true },
    });
  }

  // Ensure logo is properly parsed if it's a JSON string
  let safeCompany = company;
  if (company && typeof company.logo === "string") {
    try {
      safeCompany = { ...company, logo: JSON.parse(company.logo) };
    } catch (e) {
      console.error("Failed to parse company logo", e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-200/50 flex flex-col">
      <PreviewToolbar proposalId={proposal.id} />
      
      <main className="flex-1 overflow-auto py-8">
        <div id="proposal-preview-wrapper" className="transition-transform duration-200 ease-out pb-16">
          <ProposalRenderer 
            proposal={proposal} 
            blocks={blocks} 
            company={safeCompany}
            bankAccount={bankAccount}
          />
          
          <AcceptProposalButton 
            proposalId={proposal.id} 
            currentStatus={proposal.status} 
          />
        </div>
      </main>
    </div>
  );
}
