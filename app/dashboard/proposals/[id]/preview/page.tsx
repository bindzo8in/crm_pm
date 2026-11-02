import { getProposalComposerData } from "@/actions/proposal-composer";
import { ProposalRenderer } from "@/components/proposal/renderer/ProposalRenderer";
import { PreviewToolbar } from "@/components/proposal/preview/PreviewToolbar";
import prisma from "@/lib/prisma";
import { requirePageAccess } from "@/lib/auth-guard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getProposalWorkflowValidation } from "@/lib/proposal-workflow-validation";
import { ProposalStepGate } from "@/components/proposal/proposal-step-gate";

export const metadata = {
  title: "Proposal Preview",
};

function getCompanyLogoUrl(logo: unknown): string | undefined {
  let value = logo;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value) || !("url" in value)) {
    return undefined;
  }
  return typeof value.url === "string" ? value.url : undefined;
}

interface ProposalPreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalPreviewPage({ params }: ProposalPreviewPageProps) {
  await requirePageAccess("/dashboard/proposals");
  const { id } = await params;

  const validation = await getProposalWorkflowValidation(id);
  if (!validation) {
    return (
      <main className="min-h-svh bg-muted/20 p-6">
        <ProposalStepGate
          title="Proposal not found"
          description="This proposal may have been removed."
          href="/dashboard/proposals"
          action="Back to proposals"
        />
      </main>
    );
  }
  if (validation.status === "DRAFT" && !validation.detailsValid) {
    return (
      <main className="min-h-svh bg-muted/20 p-6">
        <ProposalStepGate
          title="Complete proposal details first"
          description="Add a customer and proposal title before reviewing the proposal."
          href={`/dashboard/proposals/${id}/edit`}
          action="Complete details"
        />
      </main>
    );
  }
  if (validation.status === "DRAFT" && !validation.pricingValid) {
    return (
      <main className="min-h-svh bg-muted/20 p-6">
        <ProposalStepGate
          title="Complete pricing before Step 4"
          description={validation.pricingMessage ?? "Add at least one priced line item before reviewing the proposal."}
          href={`/dashboard/proposals/${id}/builder`}
          action="Add proposal pricing"
        />
      </main>
    );
  }
  if (validation.status === "DRAFT" && !validation.documentValid) {
    return (
      <main className="min-h-svh bg-muted/20 p-6">
        <ProposalStepGate
          title="Complete the proposal document"
          description={validation.documentMessage ?? "Show at least one document section before previewing."}
          href={`/dashboard/proposals/${id}/composer`}
          action="Review document"
        />
      </main>
    );
  }

  const res = await getProposalComposerData(id);

  if (!res.success || !res.data) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/20 p-4">
        <section role="alert" className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Proposal preview unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This proposal may have been removed or your account may not have permission to view it.
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/proposals">Back to proposals</Link>
          </Button>
        </section>
      </main>
    );
  }

  const { proposal, blocks } = res.data;
  const proposalDetails = proposal as typeof proposal & {
    bankAccountId?: string | null;
    customer?: { primaryContactEmail?: string | null };
    proposalServices?: Array<{
      serviceName: string;
      packageName?: string | null;
      items: Array<{ name: string; quantity: number; total: number }>;
    }>;
  };

  const company = await prisma.company.findFirst();
  let bankAccount = null;

  if (proposalDetails.bankAccountId) {
    bankAccount = await prisma.companyBankAccount.findUnique({
      where: { id: proposalDetails.bankAccountId },
    });
  } else if (company) {
    bankAccount = await prisma.companyBankAccount.findFirst({
      where: { companyId: company.id, isDefault: true, isActive: true },
    });
  }

  let safeCompany = company;
  if (company && typeof company.logo === "string") {
    try {
      safeCompany = { ...company, logo: JSON.parse(company.logo) };
    } catch {
      safeCompany = company;
    }
  }
  const companyLogoUrl = getCompanyLogoUrl(safeCompany?.logo);

  return (
    <div className="min-h-screen bg-gray-200/50 flex flex-col">
      <PreviewToolbar
        proposalId={proposal.id}
        proposalNumber={proposal.proposalNumber}
        proposalStatus={proposal.status}
        clientEmail={proposalDetails.customer?.primaryContactEmail}
        proposalDetails={{
          title: proposal.title,
          customerName: proposal.customerDisplayName,
          customerCompanyName: proposal.customerCompanyName,
          currency: proposal.currency,
          subtotal: Number(proposal.subtotal),
          discount: Number(proposal.discount),
          tax: Number(proposal.tax),
          grandTotal: Number(proposal.grandTotal),
          validUntil: proposal.validUntil?.toISOString() ?? null,
          services: proposalDetails.proposalServices?.map((service) => ({
            name: service.packageName
              ? service.packageName.trim().toLowerCase() === service.serviceName.trim().toLowerCase()
                ? service.serviceName
                : `${service.serviceName} (${service.packageName})`
              : service.serviceName,
            items: service.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              total: item.total,
            })),
          })) ?? [],
          bankAccount: bankAccount ? {
            bankName: bankAccount.bankName,
            accountName: bankAccount.accountName,
            accountNumber: bankAccount.accountNumber,
            ifscCode: bankAccount.ifscCode,
            swiftCode: bankAccount.swiftCode,
            upiId: bankAccount.upiId,
          } : null,
        }}
      />

      <main className="min-h-0 flex-1 overflow-auto px-3 py-8 pb-32 sm:px-6 sm:pb-24">
        <div id="proposal-preview-wrapper" className="transition-transform duration-200 ease-out pb-16">
          <ProposalRenderer
            proposal={proposal}
            blocks={blocks}
            company={safeCompany}
            bankAccount={bankAccount}
          />

        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t bg-background/95 px-4 py-3 text-center shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.1)] backdrop-blur-sm print:hidden">
        {companyLogoUrl && (
          <img src={companyLogoUrl} alt="Company logo" className="h-8 object-contain" />
        )}
        {(safeCompany?.displayName || safeCompany?.legalName) && (
          <span className="text-sm font-semibold">
            {safeCompany.displayName || safeCompany.legalName}
          </span>
        )}
        {safeCompany?.website && (
          <>
            <span aria-hidden="true" className="hidden h-4 border-l sm:block" />
            <a
              href={safeCompany.website.startsWith("http") ? safeCompany.website : `https://${safeCompany.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium text-primary hover:underline"
            >
              {safeCompany.website}
            </a>
          </>
        )}
      </footer>
    </div>
  );
}
