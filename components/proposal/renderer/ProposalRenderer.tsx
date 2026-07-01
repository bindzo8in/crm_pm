import React from "react";
import "./proposal-renderer.css";
import { CoverRenderer } from "./CoverRenderer";
import { PricingRenderer } from "./PricingRenderer";
import { RichTextRenderer } from "./RichTextRenderer";
import { TimelineRenderer } from "./TimelineRenderer";
import { SignatureRenderer } from "./SignatureRenderer";
import { PageBreakRenderer } from "./PageBreakRenderer";
import { ProposalBlockType } from "@/app/generated/prisma/client";

interface ProposalRendererProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposal: any;
  blocks: Array<{
    id: string;
    type: string;
    title: string | null;
    content?: unknown;
    isHidden?: boolean;
  }>;
}

export function ProposalRenderer({ proposal, blocks }: ProposalRendererProps) {
  const visibleBlocks = blocks.filter((b) => !b.isHidden);

  return (
    <div className="proposal-renderer-document">
      {visibleBlocks.map((block) => {
        switch (block.type as ProposalBlockType) {
          case "COVER":
            return <CoverRenderer key={block.id} block={block} proposal={proposal} />;
            
          case "PRICING":
            return <PricingRenderer key={block.id} block={block} proposal={proposal} />;
            
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
            return null; // Gracefully handle unknown blocks
        }
      })}
    </div>
  );
}
