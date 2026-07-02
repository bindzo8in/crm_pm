import React from "react";

export function CoverTop({ company, config }: { company: any; config: any }) {
  // Try to use the template logo, fallback to company logo, or use text
  const logo = config.coverLogo?.url || company?.logo?.url;

  return (
    <div className="relative w-full h-48 flex justify-between items-start pt-12 px-12 z-10">
      {/* Decorative top-left graphics (simulating the gray circles from the mockup) */}
      <div className="absolute top-0 left-0 w-64 h-64 overflow-hidden z-0 pointer-events-none opacity-20">
        {config.coverBackground?.url ? (
          <img 
            src={config.coverBackground.url} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : (
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full -ml-8 -mt-8">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#9ca3af" strokeWidth="40" />
            <circle cx="40" cy="40" r="60" fill="none" stroke="#9ca3af" strokeWidth="20" />
          </svg>
        )}
      </div>

      <div className="flex-1"></div>

      {/* Top Right Logo */}
      <div className="z-10 relative">
        {logo ? (
          <img src={logo} alt="Company Logo" className="h-16 object-contain" />
        ) : (
          <div className="text-2xl font-bold tracking-widest text-slate-800">
            {company?.displayName || "COMPANY"}
          </div>
        )}
      </div>
    </div>
  );
}
