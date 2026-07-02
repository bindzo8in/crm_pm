import React from "react";
import "./proposal-renderer.css";
import { PricingRenderer } from "./PricingRenderer";
import { RichTextRenderer } from "./RichTextRenderer";
import { TimelineRenderer } from "./TimelineRenderer";
import { SignatureRenderer } from "./SignatureRenderer";
import { PageBreakRenderer } from "./PageBreakRenderer";
import { ProposalBlockType } from "@/app/generated/prisma/client";

import { ProposalCover } from "./templates/ProposalCover";

interface ProposalRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposal: any;
  blocks: Array<{
    id: string;
    type: string;
    title: string | null;
    content?: unknown;
    isVisible?: boolean;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bankAccount?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template?: any;
}

export function ProposalRenderer({ proposal, blocks, company, bankAccount, template }: ProposalRendererProps) {
  const visibleBlocks = blocks.filter((b) => b.isVisible !== false);
  const otherBlocks = visibleBlocks.filter(b => b.type !== "COVER");

  return (
    <div className="proposal-renderer-document">
      <ProposalCover proposal={proposal} company={company} template={template} />
      
      {otherBlocks.length > 0 && (
        <div className="proposal-page-content">
          {otherBlocks.map((block) => {
            switch (block.type as ProposalBlockType) {
              case "PRICING":
                return <PricingRenderer key={block.id} block={block} proposal={proposal} bankAccount={bankAccount} />;
                
              case "FEATURES":
              case "TERMS":
              case "CUSTOM":
                return <RichTextRenderer key={block.id} block={block} />;
                
              case "TIMELINE":
                return <TimelineRenderer key={block.id} block={block} />;
                
              case "SIGNATURE":
                return <SignatureRenderer key={block.id} block={block} />;
                
              case "PAGE_BREAK":
                return <PageBreakRenderer key={block.id} />;
                
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
