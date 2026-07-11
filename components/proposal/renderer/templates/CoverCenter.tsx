import React from "react";
import { format } from "date-fns";

export function CoverCenter({ proposal, company, config }: { proposal: any; company: any; config: any }) {
  const preparedFor = proposal?.customerCompanyName || proposal?.customerDisplayName || "Valued Client";
  const preparedBy = proposal?.preparedByName || "Account Executive";
  const subtitle = proposal?.notes || "Prepared exclusively for your business";
  
  const dateStr = proposal?.createdAt ? format(new Date(proposal.createdAt), "dd MMM, yyyy") : format(new Date(), "dd MMM, yyyy");
  let validUntilStr = null;
  if (proposal?.validUntil) {
    const start = new Date(proposal?.createdAt || new Date());
    const end = new Date(proposal.validUntil);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    validUntilStr = `${diffDays} Days`;
  }

  const accentColor = config.accentColor || "#000000";

  const coverBlock = proposal?.blocks?.find((b: any) => b.type === "COVER");
  const coverContent = coverBlock?.content || {};
  const showTitle = coverContent.showProposalTitle !== false;
  const showNotes = coverContent.showNotes !== false;

  return (
    <div className="flex-1 flex flex-col justify-center px-16 relative z-10 min-h-0 overflow-hidden">
      
      <div className="flex justify-between items-end border-l-4 pl-6 mb-10" style={{ borderColor: accentColor }}>
        
        {/* Client details */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Prepared For</span>
          <span className="text-2xl font-bold text-gray-800 leading-tight">{preparedFor}</span>
          {proposal?.customer && (
            <div className="text-sm font-medium text-gray-500 flex flex-col gap-0.5 mt-2">
              {proposal.customer.addressLine1 && <span>{proposal.customer.addressLine1}{", "}</span>}
              {proposal.customer.addressLine2 && <span>{proposal.customer.addressLine2}{", "}</span>}
              {proposal.customer.city && (
                <span>
                  {[proposal.customer.city, proposal.customer.state, proposal.customer.postalCode].filter(Boolean).join(", ")}{", "}
                </span>
              )}
              {proposal.customer.country && <span>{proposal.customer.country}</span>}
              {proposal.customer.gstNumber && <span className="font-bold text-gray-700 mt-1 uppercase">GSTIN: {proposal.customer.gstNumber}</span>}
            </div>
          )}
        </div>

        {/* Meta details */}
        <div className="flex flex-col gap-4 text-right">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Quotation No</span>
            <span className="text-lg font-bold text-gray-800">QUOT-{proposal?.proposalNumber}</span>
          </div>
          
          <div className="flex gap-8 justify-end">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Date</span>
              <span className="text-sm font-bold text-gray-800">{dateStr}</span>
            </div>
            {validUntilStr && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Valid Until</span>
                <span className="text-sm font-bold text-gray-800">{validUntilStr}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Title block */}
      {(showTitle || showNotes) && (
        <div className="mb-8">
          {showTitle && (
            <h1 
              className="text-6xl font-black uppercase tracking-tighter leading-none mb-4"
              style={{ color: config.primaryColor || "#1f2937" }}
            >
              {proposal?.title || "QUOTATION"}
            </h1>
          )}
          {showNotes && (
            <p className="text-xl font-light text-gray-500 max-w-lg leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Confidentiality Notice */}
      <div className="mt-8 pt-6 border-t border-gray-100 max-w-lg">
        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-2">Confidential & Proprietary</span>
        <p className="text-[10px] font-medium text-gray-400 leading-relaxed uppercase tracking-wider">
          This document contains confidential business information and trade secrets. It is intended solely for the use of the individual or entity to whom it is addressed.
        </p>
      </div>

    </div>
  );
}
