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
      <h2 className="text-2xl font-bold text-gray-900 mb-12 border-b pb-4">{block.title || "Acceptance & Sign-off"}</h2>
      
      <p className="text-sm text-gray-600 mb-12">
        By signing below, both parties agree to the terms, conditions, and pricing outlined in this quotation.
      </p>

      {/* What Happens Next? */}
      <div className="bg-gray-50/50 border rounded-lg p-6 mb-12">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">What Happens Next?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mb-1">1</div>
            <span className="text-sm font-bold text-gray-800">Review & Sign</span>
            <span className="text-xs text-gray-500 leading-relaxed">Sign this document digitally to confirm your acceptance.</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mb-1">2</div>
            <span className="text-sm font-bold text-gray-800">Kickoff Invoice</span>
            <span className="text-xs text-gray-500 leading-relaxed">You'll receive the initial invoice as per the payment schedule.</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold mb-1">3</div>
            <span className="text-sm font-bold text-gray-800">Project Starts</span>
            <span className="text-xs text-gray-500 leading-relaxed">Our team immediately begins work on your project.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 mt-8">
        {/* Client Signature */}
        <div className="space-y-6">
          <div className="border-b border-gray-400 pb-2 flex items-end h-24 relative">
            {clientSignatureUrl ? (
              <img src={clientSignatureUrl} alt="Client Signature" className="max-h-20 max-w-[200px] object-contain absolute bottom-2 left-0" />
            ) : (
              <span className="text-xs text-gray-400 italic">Signature & Stamp</span>
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{clientSignatory}</p>
            <p className="text-sm font-medium text-gray-500">{clientDesignation}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 border-t pt-2 w-max">For Client</p>
          </div>
          <div className="mt-6 pt-4 border-t border-dashed border-gray-200 grid grid-cols-1 gap-2 text-[10px] text-gray-400 font-mono">
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
          <div className="border-b border-gray-400 pb-2 flex items-end h-24 relative">
            {companySealUrl && (
              <img src={companySealUrl} alt="Company Seal" className="max-h-24 max-w-[120px] object-contain absolute bottom-0 left-12 opacity-50 z-0 mix-blend-multiply" />
            )}
            {companySignatureUrl ? (
              <img src={companySignatureUrl} alt="Company Signature" className="max-h-20 max-w-[200px] object-contain absolute bottom-2 left-0 z-10" />
            ) : (
              <span className="text-xs text-gray-400 italic relative z-10">Signature & Date</span>
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{companySignatory}</p>
            <p className="text-sm font-medium text-gray-500">{companyDesignation}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 border-t pt-2 w-max">For Company</p>
          </div>
          <div className="mt-6 pt-4 border-t border-dashed border-gray-200 grid grid-cols-1 gap-2 text-[10px] text-gray-400 font-mono">
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
