import React from "react";
import { format } from "date-fns";

export function CoverCenter({ proposal, company, config }: { proposal: any; company: any; config: any }) {
  const preparedFor = proposal?.customerCompanyName || proposal?.customerDisplayName || "Valued Client";
  const preparedBy = proposal?.preparedByName || "Account Executive";
  const subtitle = proposal?.notes || "Prepared exclusively for your business";
  
  const dateStr = proposal?.createdAt ? format(new Date(proposal.createdAt), "dd MMM, yyyy") : format(new Date(), "dd MMM, yyyy");
  const validUntilStr = proposal?.validUntil ? format(new Date(proposal.validUntil), "dd MMM, yyyy") : null;

  const accentColor = config.accentColor || "#000000";

  return (
    <div className="flex-1 flex flex-col justify-center px-16 relative z-10">
      
      {/* Title block */}
      <div className="mb-12">
        <h1 
          className="text-6xl font-black uppercase tracking-tighter leading-none mb-4"
          style={{ color: config.primaryColor || "#1f2937" }}
        >
          {proposal?.title || "PROPOSAL"}
        </h1>
        <p className="text-xl font-light text-gray-500 max-w-lg leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="flex justify-between items-end border-l-4 pl-6" style={{ borderColor: accentColor }}>
        
        {/* Client details */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Prepared For</span>
          <span className="text-2xl font-bold text-gray-800">{preparedFor}</span>
          <span className="text-sm font-medium text-gray-500">{proposal?.customer?.city || ""}</span>
        </div>

        {/* Meta details */}
        <div className="flex flex-col gap-4 text-right">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Proposal No</span>
            <span className="text-lg font-bold text-gray-800">#{proposal?.proposalNumber}</span>
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

      {/* Prepared By - Moved slightly away from the block above for whitespace breathing room */}
      <div className="mt-16 pt-8 border-t border-gray-100 max-w-sm">
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase block mb-1">Prepared By</span>
        <span className="text-lg font-bold text-gray-800 block">{preparedBy}</span>
        <span className="text-sm font-medium text-gray-500">{company?.displayName || "Our Company"}</span>
      </div>

    </div>
  );
}
