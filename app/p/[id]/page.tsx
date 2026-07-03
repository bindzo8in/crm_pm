import { getPublicProposalData } from "@/actions/public-proposal";
import { ProposalRenderer } from "@/components/proposal/renderer/ProposalRenderer";
import { AcceptProposalButton } from "@/components/proposal/preview/AcceptProposalButton";
import { PublicPreviewToolbar } from "@/components/proposal/preview/PublicPreviewToolbar";
import prisma from "@/lib/prisma";
import { Metadata } from "next";

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const res = await getPublicProposalData(params.id);
  
  if (!res.success || !res.data) {
    return { title: "Proposal Not Found" };
  }

  return {
    title: `Proposal - ${res.data.proposal.customerDisplayName || "Client"}`,
  };
}

export default async function PublicProposalPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const res = await getPublicProposalData(id);

  if (!res.success || !res.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500 font-sans">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Proposal Unavailable</h1>
          <p className="text-gray-500">This proposal could not be found. It may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const { proposal, blocks } = res.data;

  // Fetch Company and associated Bank Account for rendering
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
    <div className="min-h-screen bg-gray-200/50 flex flex-col font-sans">
      <PublicPreviewToolbar />
      <main className="flex-1 overflow-auto py-8 mb-16">
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
            isPublic={true}
          />
        </div>
      </main>

      <footer className="fixed bottom-0 w-full bg-white/90 backdrop-blur-sm border-t p-3 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] z-40 flex items-center justify-center gap-3 print:hidden">
        {(safeCompany?.logo as any)?.url && (
          <img src={(safeCompany?.logo as any).url} alt="Company Logo" className="h-8 object-contain" />
        )}
        <span className="font-semibold text-slate-700 text-sm">{safeCompany?.displayName || safeCompany?.legalName || 'Company Name'}</span>
        {safeCompany?.website && (
          <>
            <span className="text-gray-300">|</span>
            <a 
              href={safeCompany.website.startsWith('http') ? safeCompany.website : `https://${safeCompany.website}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium transition-colors"
            >
              {safeCompany.website.replace(/^https?:\/\//, '')}
            </a>
          </>
        )}
      </footer>
    </div>
  );
}
