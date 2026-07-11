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
          cover stays full-bleed. All other blocks use @page { margin: 20mm 0 15mm 0 }. */}
      <div className="proposal-pdf-page proposal-cover-page flex flex-col" style={{ width: "210mm", height: "297mm", overflow: "hidden", padding: 0 }}>
        <ProposalCover proposal={{ ...proposal, blocks }} company={company} template={template} />
      </div>

      {otherBlocks.map((block) => {
        switch (block.type as ProposalBlockType) {
          case "PRICING":
            return (
              <div
                key={block.id}
                className="proposal-pdf-page proposal-page-break-before proposal-page-content"
                style={{ width: "210mm" }}
              >
                <PageHeader
                  proposal={proposal}
                  title={block.title || "Investment Breakdown"}
                  subtitle="Transparent pricing for your selected services and packages."
                />
                <div className="pt-4">
                  <PricingRenderer block={block} proposal={proposal} bankAccount={bankAccount} />
                </div>
                {/* Screen-only footer (in print, Puppeteer footerTemplate handles it) */}
                <div className="screen-only absolute bottom-0 left-0 w-full px-[20mm] z-10">
                  <PageFooter company={company} proposal={proposal} />
                </div>
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
                className="proposal-pdf-page proposal-page-break-before proposal-page-content"
                style={{ width: "210mm" }}
              >
                <PageHeader proposal={proposal} title={block.title || "Project Timeline & Milestones"} />
                <div className="pt-8">
                  <TimelineRenderer block={block} />
                </div>
                {/* Screen-only footer (in print, Puppeteer footerTemplate handles it) */}
                <div className="screen-only absolute bottom-0 left-0 w-full px-[20mm] z-10">
                  <PageFooter company={company} proposal={proposal} />
                </div>
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
                className="proposal-pdf-page proposal-page-break-before proposal-signature-page proposal-strict-page-height"
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
                {/* Main content with bottom padding to leave room for absolutely-pinned footer */}
                <div className="relative z-10 w-full px-[20mm] pt-[20mm]" style={{ paddingBottom: "200px" }}>
                  <PageHeader proposal={proposal} title={block.title || "Acceptance & Sign-off"} />
                  <div className="pt-16">
                    <SignatureRenderer block={block} proposal={proposal} company={company} />
                  </div>
                </div>
                {/* Footer pinned absolutely to the bottom of the 297mm container */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <CoverFooter proposal={proposal} company={company} config={config} showPageNumber={false} />
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
