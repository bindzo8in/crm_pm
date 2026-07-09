import React from "react";

export function PageHeader({ proposal }: { proposal?: any }) {
  const preparedFor = proposal?.customerCompanyName || proposal?.customerDisplayName || "Valued Client";

  return (
    <div className="w-[calc(100%-40mm)] flex items-center justify-between text-xs text-gray-500 page-header-print absolute top-[20mm] left-[20mm] bg-transparent z-30">
      <span className="text-gray-500 tracking-wider font-semibold text-[10px] uppercase">
        {preparedFor}
      </span>
      {proposal?.proposalNumber && (
        <span className="text-gray-400 tracking-widest uppercase font-medium text-[10px]">
          QUOT-{proposal.proposalNumber}
        </span>
      )}
    </div>
  );
}
