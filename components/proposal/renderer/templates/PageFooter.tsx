import React from "react";

export function PageFooter({ company, proposal }: { company?: any, proposal?: any }) {
  if (!company) return null;

  return (
    <div className="w-full pt-4 pb-2 border-t border-gray-300 flex items-center justify-between text-xs text-black font-semibold page-footer-print bg-white z-30 mt-6">
      <div className="flex items-center gap-3">
        {company?.logo?.url && (
          <img src={company.logo.url} alt="Logo" className="h-6 w-auto object-contain" />
        )}
        <span className="font-bold text-black">{company?.displayName || company?.legalName}</span>
      </div>
      
      <div className="flex items-center gap-6">
        {company?.website && (
          <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="text-black font-semibold hover:underline transition-colors">
            {company.website.replace(/^https?:\/\//, '')}
          </a>
        )}
        <span className="page-number-display font-bold text-black"></span>
      </div>
    </div>
  );
}
