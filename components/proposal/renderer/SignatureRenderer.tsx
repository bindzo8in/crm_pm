import React from "react";
import "./proposal-renderer.css";

interface SignatureContent {
  clientSignatory?: string;
  clientDesignation?: string;
  companySignatory?: string;
  companyDesignation?: string;
}

interface SignatureRendererProps {
  block: {
    title: string | null;
    content?: unknown;
  };
  proposal?: any;
  company?: any;
}

export function SignatureRenderer({ block, proposal, company }: SignatureRendererProps) {
  const content = (block.content as SignatureContent) || {};
  const {
    clientSignatory = "Authorized Signatory",
    clientDesignation = "Client Representative",
    companySignatory = "Account Executive",
    companyDesignation = "Company Representative",
  } = content;

  // Extract signature images if they exist
  const clientSignatureUrl = proposal?.clientSignature?.url || null;
  
  // Need to parse company logo/signatures safely just in case they are strings
  let companySignatureUrl = null;
  if (company?.signatureImage) {
    if (typeof company.signatureImage === 'string') {
      try {
        companySignatureUrl = JSON.parse(company.signatureImage).url;
      } catch (e) {
        // ignore
      }
    } else {
      companySignatureUrl = company.signatureImage.url;
    }
  }

  let companySealUrl = null;
  if (company?.sealImage) {
    if (typeof company.sealImage === 'string') {
      try {
        companySealUrl = JSON.parse(company.sealImage).url;
      } catch (e) {
        // ignore
      }
    } else {
      companySealUrl = company.sealImage.url;
    }
  }

  return (
    <div className="mb-16 break-inside-avoid">
      
      <p className="text-sm font-medium text-black mb-12">
        By signing below, both parties agree to the terms, conditions, and pricing outlined in this quotation.
      </p>

      {/* What Happens Next? */}
      <div className="bg-gray-50/50 border border-gray-300 rounded-lg p-6 mb-12">
        <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4">What Happens Next?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold mb-1">1</div>
            <span className="text-sm font-bold text-black">Review & Sign</span>
            <span className="text-xs text-black font-medium leading-relaxed">Sign this document digitally to confirm your acceptance.</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold mb-1">2</div>
            <span className="text-sm font-bold text-black">Kickoff Invoice</span>
            <span className="text-xs text-black font-medium leading-relaxed">You'll receive the initial invoice as per the payment schedule.</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold mb-1">3</div>
            <span className="text-sm font-bold text-black">Project Starts</span>
            <span className="text-xs text-black font-medium leading-relaxed">Our team immediately begins work on your project.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mt-8">
        {/* Client Signature */}
        <div className="space-y-6">
          <div className="border-b border-black pb-2 flex items-end h-24 relative">
            {clientSignatureUrl ? (
              <img src={clientSignatureUrl} alt="Client Signature" className="max-h-20 max-w-[200px] object-contain absolute bottom-2 left-0" />
            ) : (
              <span className="text-xs text-black/60 font-medium italic">Signature & Stamp</span>
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-black">{clientSignatory}</p>
            <p className="text-sm font-semibold text-black">{clientDesignation}</p>
            <p className="text-xs font-bold text-black uppercase tracking-wider mt-4 border-t border-black/20 pt-2 w-max">For Client</p>
          </div>
          <div className="mt-6 pt-4 border-t border-dashed border-gray-300 grid grid-cols-1 gap-2 text-[10px] text-black font-semibold font-mono">
            <div className="flex justify-between"><span>Date Signed:</span> <span>{clientSignatureUrl ? (proposal?.updatedAt ? new Date(proposal.updatedAt).toLocaleDateString() : 'Recorded') : 'Pending'}</span></div>
            <div className="flex justify-between">
              <span>{proposal?.customer?.email ? 'Signee Email:' : (proposal?.customer?.phone ? 'Signee Phone:' : 'Signee Email:')}</span> 
              <span>{proposal?.customer?.email || proposal?.customer?.phone || 'Pending'}</span>
            </div>
            {proposal?.clientSignedIp && (
              <div className="flex justify-between"><span>IP Address:</span> <span>{proposal.clientSignedIp}</span></div>
            )}
          </div>
        </div>

        {/* Company Signature */}
        <div className="space-y-6">
          <div className="border-b border-black pb-2 flex items-end h-24 relative">
            {companySealUrl && (
              <img src={companySealUrl} alt="Company Seal" className="max-h-24 max-w-[120px] object-contain absolute bottom-0 left-12 opacity-50 z-0 mix-blend-multiply" />
            )}
            {companySignatureUrl ? (
              <img src={companySignatureUrl} alt="Company Signature" className="max-h-20 max-w-[200px] object-contain absolute bottom-2 left-0 z-10" />
            ) : (
              <span className="text-xs text-black/60 font-medium italic relative z-10">Signature & Date</span>
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-black">{companySignatory}</p>
            <p className="text-sm font-semibold text-black">{companyDesignation}</p>
            <p className="text-xs font-bold text-black uppercase tracking-wider mt-4 border-t border-black/20 pt-2 w-max">For Company</p>
          </div>
          <div className="mt-6 pt-4 border-t border-dashed border-gray-300 grid grid-cols-1 gap-2 text-[10px] text-black font-semibold font-mono">
            <div className="flex justify-between"><span>Date Signed:</span> <span>{proposal?.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : 'Recorded'}</span></div>
            <div className="flex justify-between">
              <span>{company?.email ? 'Signee Email:' : (company?.phone ? 'Signee Phone:' : 'Signee Email:')}</span> 
              <span>{company?.email || company?.phone || 'Recorded'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
