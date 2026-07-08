import React from "react";
import "./proposal-renderer.css";
import { PricingRenderer } from "./PricingRenderer";
import { RichTextRenderer } from "./RichTextRenderer";
import { TimelineRenderer } from "./TimelineRenderer";
import { SignatureRenderer } from "./SignatureRenderer";
import { ProposalBlockType } from "@/app/generated/prisma/client";

import { ProposalCover } from "./templates/ProposalCover";
import { CoverFooter } from "./templates/CoverFooter";

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
  const otherBlocks = visibleBlocks.filter(b => b.type !== "COVER" && b.type !== "PAGE_BREAK");

  return (
    <div className="proposal-renderer-document">
      {/* Cover page — always its own PDF page */}
      <div
        className="proposal-pdf-page"
        style={{ width: "210mm", minHeight: "297mm", maxHeight: "297mm", overflow: "hidden", background: "white", position: "relative" }}
      >
        <ProposalCover proposal={proposal} company={company} template={template} />
      </div>

      {otherBlocks.map((block) => {
        switch (block.type as ProposalBlockType) {
          case "PRICING":
            return (
              <div
                key={block.id}
                className="proposal-pdf-page proposal-page-content"
                style={{ width: "210mm", minHeight: "297mm", background: "white" }}
              >
                <PricingRenderer block={block} proposal={proposal} bankAccount={bankAccount} />
              </div>
            );

          case "FEATURES":
          case "TERMS":
          case "CUSTOM":
            // RichTextRenderer manages its own proposal-pdf-page containers when
            // the content contains pageBreak nodes (e.g., multiple feature groups).
            // For a single-page block it renders inline, wrapped by the div below.
            return (
              <React.Fragment key={block.id}>
                <RichTextRenderer block={block} />
              </React.Fragment>
            );

          case "TIMELINE":
            return (
              <div
                key={block.id}
                className="proposal-pdf-page proposal-page-content"
                style={{ width: "210mm", minHeight: "297mm", background: "white" }}
              >
                <TimelineRenderer block={block} />
              </div>
            );

          case "SIGNATURE": {
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

            return (
              <div
                key={block.id}
                className="proposal-pdf-page flex flex-col justify-between"
                style={{ display: "flex", width: "210mm", minHeight: "297mm", background: "white" }}
              >
                <div className="proposal-page-content flex-1">
                  <SignatureRenderer block={block} />
                </div>
                <CoverFooter proposal={proposal} company={company} config={config} />
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
