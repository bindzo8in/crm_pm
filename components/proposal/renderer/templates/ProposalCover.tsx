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
  };

  const config = template || defaultTemplate;

  if (!config.coverEnabled) return null;

  return (
    <div className="proposal-page-content p-0 relative flex flex-col w-full min-h-[297mm] h-full bg-white overflow-hidden proposal-page-break-always font-sans border-b border-gray-100">
      <CoverTop company={company} config={config} />
      <CoverCenter proposal={proposal} company={company} config={config} />
      <CoverFooter proposal={proposal} company={company} config={config} />
    </div>
  );
}
