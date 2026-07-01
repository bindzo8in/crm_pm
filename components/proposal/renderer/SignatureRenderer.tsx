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
}

export function SignatureRenderer({ block }: SignatureRendererProps) {
  const content = (block.content as SignatureContent) || {};
  const {
    clientSignatory = "Authorized Signatory",
    clientDesignation = "Client Representative",
    companySignatory = "Account Executive",
    companyDesignation = "Company Representative",
  } = content;

  return (
    <div className="proposal-page-content proposal-page-break-always break-inside-avoid">
      <h2 className="text-2xl font-bold text-gray-900 mb-12 border-b pb-4">{block.title || "Acceptance & Sign-off"}</h2>
      
      <p className="text-sm text-gray-600 mb-16">
        By signing below, both parties agree to the terms, conditions, and pricing outlined in this proposal.
      </p>

      <div className="grid grid-cols-2 gap-16 mt-8">
        {/* Client Signature */}
        <div className="space-y-12">
          <div className="border-b border-gray-400 pb-2 flex items-end h-16">
            <span className="text-xs text-gray-400 italic">Signature & Stamp</span>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{clientSignatory}</p>
            <p className="text-sm font-medium text-gray-500">{clientDesignation}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 border-t pt-2 w-max">For Client</p>
          </div>
        </div>

        {/* Company Signature */}
        <div className="space-y-12">
          <div className="border-b border-gray-400 pb-2 flex items-end h-16">
            <span className="text-xs text-gray-400 italic">Signature & Date</span>
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
