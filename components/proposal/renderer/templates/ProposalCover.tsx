import React from "react";
import { CoverTop } from "./CoverTop";
import { CoverCenter } from "./CoverCenter";
import { CoverFooter } from "./CoverFooter";

interface ProposalCoverProps {
  proposal: any;
  company: any;
  template?: any;
}

export function ProposalCover({ proposal, company, template }: ProposalCoverProps) {
  // If no template is provided, we can fallback to a default configuration
  const defaultTemplate = {
    coverEnabled: true,
    coverFooterEnabled: true,
    showServices: true,
    showContacts: true,
    showAddress: true,
    primaryColor: "#0B1B3D",
    secondaryColor: "#D4AF37",
    coverBackground: { url: "/cover_bg.webp"}
  };

  const config = template || defaultTemplate;

  if (!config.coverEnabled) return null;

  return (
    <div className="relative flex flex-col w-full h-[297mm] max-h-[297mm] bg-white overflow-hidden proposal-page-break-after font-sans">
      {config.coverBackground?.url && (
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
          <img 
            src={config.coverBackground.url} 
            alt="Cover Background" 
            className="w-full h-full object-fill"
          />
        </div>
      )}
      <div className="relative z-10 flex flex-col flex-1 w-full h-full">
        <CoverTop company={company} config={config} />
        <CoverCenter proposal={proposal} company={company} config={config} />
        <CoverFooter proposal={proposal} company={company} config={config} />
      </div>
    </div>
  );
}
