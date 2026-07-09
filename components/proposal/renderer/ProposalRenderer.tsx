import React from "react";
import "./proposal-renderer.css";
import { PricingRenderer } from "./PricingRenderer";
import { RichTextRenderer } from "./RichTextRenderer";
import { TimelineRenderer } from "./TimelineRenderer";
import { SignatureRenderer } from "./SignatureRenderer";
import { ProposalBlockType } from "@/app/generated/prisma/client";

import { ProposalCover } from "./templates/ProposalCover";
import { CoverFooter } from "./templates/CoverFooter";

import { PageHeader } from "./templates/PageHeader";
import { PageFooter } from "./templates/PageFooter";

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
      {/* Cover page — always its own PDF page.
          proposal-cover-page applies @page cover-page { margin: 0 } so the
          cover stays full-bleed. All other blocks use @page { margin: 20mm 0 }. */}
      <div className="proposal-pdf-page proposal-cover-page" style={{ width: "210mm", height: "297mm" }}>
        <ProposalCover proposal={proposal} company={company} template={template} />
      </div>

      {otherBlocks.map((block) => {
        switch (block.type as ProposalBlockType) {
          case "PRICING":
            return (
              // proposal-pdf-page is the on-screen visual separator.
              // proposal-page-break-before tells Chromium to start a new PDF page here.
              <div
                key={block.id}
                className="proposal-pdf-page proposal-page-break-before proposal-page-content flex flex-col min-h-[297mm]"
                style={{ width: "210mm" }}
              >
                <PageHeader proposal={proposal} />
                <div className="flex-1 pt-16 pb-16">
                  <PricingRenderer block={block} proposal={proposal} bankAccount={bankAccount} />
                </div>
                <PageFooter company={company} proposal={proposal} />
              </div>
            );

          case "FEATURES":
          case "TERMS":
          case "CUSTOM": {
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
            const bgUrl = block.type === "FEATURES" ? config.coverBackground?.url : undefined;

            // For FEATURES blocks, pass the services array so the renderer
            // can display the corresponding service badge and watermark on each page.
            const services = block.type === "FEATURES" 
              ? (proposal.proposalServices as Array<{ serviceName: string; packageName?: string | null }> | undefined)
              : undefined;

            return (
              <React.Fragment key={block.id}>
                <RichTextRenderer
                  block={block}
                  blockType={block.type}
                  backgroundUrl={bgUrl}
                  services={services}
                  company={company}
                  proposal={proposal}
                />
              </React.Fragment>
            );
          }

          case "TIMELINE":
            return (
              <div
                key={block.id}
                className="proposal-pdf-page proposal-page-break-before proposal-page-content flex flex-col min-h-[297mm]"
                style={{ width: "210mm" }}
              >
                <PageHeader proposal={proposal} />
                <div className="flex-1 pt-16 pb-16">
                  <TimelineRenderer block={block} />
                </div>
                <PageFooter company={company} proposal={proposal} />
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
            const bgUrl = config.coverBackground?.url;

            return (
              <div
                key={block.id}
                className="proposal-pdf-page proposal-page-break-before proposal-page-content relative flex flex-col min-h-[297mm]"
                style={{ width: "210mm" }}
              >
                {bgUrl && (
                  <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                    <img
                      src={bgUrl}
                      alt="Background"
                      className="w-full h-full object-fill opacity-20"
                    />
                  </div>
                )}
                <PageHeader proposal={proposal} />
                <div className="relative z-10 pt-16 flex-1 pb-32">
                  <SignatureRenderer block={block} proposal={proposal} company={company} />
                </div>
                <div className="absolute bottom-0 left-0 w-full z-10">
                  <CoverFooter proposal={proposal} company={company} config={config} />
                </div>
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
