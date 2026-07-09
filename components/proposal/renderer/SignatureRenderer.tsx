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

  return (
    <div className="mb-16 break-inside-avoid">
      <h2 className="text-2xl font-bold text-gray-900 mb-12 border-b pb-4">{block.title || "Acceptance & Sign-off"}</h2>
      
      <p className="text-sm text-gray-600 mb-16">
        By signing below, both parties agree to the terms, conditions, and pricing outlined in this quotation.
      </p>

      <div className="grid grid-cols-2 gap-16 mt-8">
        {/* Client Signature */}
        <div className="space-y-12">
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
        </div>

        {/* Company Signature */}
        <div className="space-y-12">
          <div className="border-b border-gray-400 pb-2 flex items-end h-24 relative">
            {companySignatureUrl ? (
              <img src={companySignatureUrl} alt="Company Signature" className="max-h-20 max-w-[200px] object-contain absolute bottom-2 left-0" />
            ) : (
              <span className="text-xs text-gray-400 italic">Signature & Date</span>
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{companySignatory}</p>
            <p className="text-sm font-medium text-gray-500">{companyDesignation}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 border-t pt-2 w-max">For Company</p>
          </div>
        </div>
      </div>
    </div>
  );
}
