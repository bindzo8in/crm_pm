import React from "react";

export function PageFooter({ company, proposal }: { company?: any, proposal?: any }) {
  if (!company) return null;

  return (
    <div className="w-full pt-4 pb-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 page-footer-print bg-white z-30 mt-6">
      <div className="flex items-center gap-3">
        {company?.logo?.url && (
          <img src={company.logo.url} alt="Logo" className="h-6 w-auto object-contain" />
        )}
        <span className="font-semibold text-gray-700">{company?.displayName || company?.legalName}</span>
      </div>
      
      <div className="flex items-center gap-6">
        {company?.website && (
          <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            {company.website.replace(/^https?:\/\//, '')}
          </a>
        )}
        <span className="page-number-display font-medium text-gray-400"></span>
      </div>
    </div>
  );
}
