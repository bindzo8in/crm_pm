import React from "react";

export function PageFooter({ company, proposal }: { company?: any, proposal?: any }) {
  if (!company) return null;

  return (
    <div className="w-[calc(100%-40mm)] pt-4 pb-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 page-footer-print absolute bottom-[20mm] left-[20mm] bg-white z-30">
      <div className="flex items-center gap-3">
        {company?.logo?.url && (
          <img src={company.logo.url} alt="Logo" className="h-6 w-auto object-contain" />
        )}
        <span className="font-semibold text-gray-700">{company?.displayName || company?.legalName}</span>
      </div>
      
      <div className="flex items-center gap-6">
        {company?.website && (
          <span>
            {company.website.replace(/^https?:\/\//, '')}
          </span>
        )}
      </div>
    </div>
  );
}
