import React from "react";

export function PageHeader({ proposal, title, subtitle, badge }: { proposal?: any, title?: string, subtitle?: string, badge?: React.ReactNode }) {
  const preparedFor = proposal?.customerCompanyName || proposal?.customerDisplayName || "Valued Client";

  return (
    <div className="w-full mb-8 pb-4 border-b border-gray-200 page-header-print bg-transparent z-30 pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 m-0 tracking-tight">
          {title}
        </h2>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-semibold uppercase tracking-widest">
            <span>{preparedFor}</span>
            {proposal?.proposalNumber && (
              <>
                <span className="text-gray-300">|</span>
                <span>QUOT-{proposal.proposalNumber}</span>
              </>
            )}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
    </div>
  );
}
