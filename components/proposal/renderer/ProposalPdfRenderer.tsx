"use client";

/**
 * ProposalPdfRenderer
 *
 * This component is used EXCLUSIVELY by the PDF generation route (/api/proposals/[id]/pdf).
 * It renders the proposal as fixed A4 pages (793×1122px at 96dpi = 210×297mm).
 *
 * Key design decisions for PDF correctness:
 * - Cover and signature pages use explicit pixel height (A4_HEIGHT_PX = 1122px).
 * - Cover and signature pages use full-bleed layout (margin: 0 via @page cover-page rule).
 * - Content pages have 20mm top/bottom margins applied via @page; no explicit height needed.
 * - No min-height, no flex-grow that can overflow into a ghost page.
 * - PageFooter is omitted — pdf-lib stamps it in post-processing.
 * - CoverFooter on the signature page is absolutely positioned at the bottom.
 */

import React from "react";
import "./proposal-pdf-renderer.css";
import { PricingRenderer } from "./PricingRenderer";
import { PdfRichTextRenderer } from "./PdfRichTextRenderer";
import { TimelineRenderer } from "./TimelineRenderer";
import { SignatureRenderer } from "./SignatureRenderer";
import { ProposalBlockType } from "@/app/generated/prisma/client";

import { ProposalCover } from "./templates/ProposalCover";
import { CoverFooter } from "./templates/CoverFooter";
import { PageHeader } from "./templates/PageHeader";

// A4 at 96dpi = 793px wide, 1122px tall (strictly within A4 210mm x 297mm to prevent Chromium overflow onto extra blank pages).
const A4_WIDTH_PX = 793;
const A4_HEIGHT_PX = 1122;

interface ProposalPdfRendererProps {
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

export function ProposalPdfRenderer({
  proposal,
  blocks,
  company,
  bankAccount,
  template,
}: ProposalPdfRendererProps) {
  const visibleBlocks = blocks.filter((b) => b.isVisible !== false);
  const otherBlocks = visibleBlocks.filter(
    (b) => b.type !== "COVER" && b.type !== "PAGE_BREAK"
  );

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

  const contentBlocks = otherBlocks.filter((b) => b.type !== "SIGNATURE");
  const signatureBlocks = otherBlocks.filter((b) => b.type === "SIGNATURE");

  const companyName = company?.displayName || company?.legalName || "";
  const websiteRaw = company?.website || "";
  const websiteDisplay = websiteRaw.replace(/^https?:\/\//, "");

  let logoUrl = null;
  if (company?.logo) {
    try {
      const logoData = typeof company.logo === "string" ? JSON.parse(company.logo) : company.logo;
      logoUrl = logoData?.url ?? null;
    } catch {}
  }

  const renderContentBlock = (block: any) => {
    switch (block.type as ProposalBlockType) {
      case "PRICING":
        return (
          <div
            key={block.id}
            className="pdf-page pdf-content-page pdf-page-break-before"
            style={{ width: A4_WIDTH_PX }}
          >
            <PageHeader
              proposal={proposal}
              title={block.title || "Investment Breakdown"}
              subtitle="Transparent pricing for your selected services and packages."
            />
            <div className="pt-4">
              <PricingRenderer
                block={block}
                proposal={proposal}
                bankAccount={bankAccount}
              />
            </div>
          </div>
        );

      case "FEATURES":
      case "TERMS":
      case "CUSTOM": {
        const bgUrl =
          block.type === "FEATURES"
            ? config.coverBackground?.url
            : undefined;
        const services =
          block.type === "FEATURES"
            ? (proposal.proposalServices as
                | Array<{ serviceName: string; packageName?: string | null }>
                | undefined)
            : undefined;

        return (
          <React.Fragment key={block.id}>
            <PdfRichTextRenderer
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
            className="pdf-page pdf-content-page pdf-page-break-before"
            style={{ width: A4_WIDTH_PX }}
          >
            <PageHeader
              proposal={proposal}
              title={block.title || "Project Timeline & Milestones"}
            />
            <div className="pt-8">
              <TimelineRenderer block={block} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pdf-renderer-document">
      {/* ── Cover page ───────────────────────────────────────────────────────
          Full-bleed (margin: 0) via @page cover-page in CSS.
          Strictly sized to A4 so it never overflows into a ghost page.
          Inner wrapper clips ProposalCover's height:297mm (1122.52px) to the
          1122px container, preventing the 0.52px micro-overflow. */}
      <div
        className="pdf-page pdf-cover-page"
        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX - 1, overflow: "hidden", padding: 0, position: "relative" }}
      >
        {/* Clipping wrapper — forces content to exactly A4_HEIGHT_PX - 1 */}
        <div style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>
          <ProposalCover
            proposal={{ ...proposal, blocks }}
            company={company}
            template={template}
          />
        </div>
      </div>
      {/* ── Content Blocks (Inside a repeating footer table) ── */}
      {contentBlocks.length > 0 && (
        <table style={{ width: A4_WIDTH_PX, borderSpacing: 0, borderCollapse: "collapse" }}>
          <thead style={{ display: "table-header-group" }}>
            <tr><td style={{ height: "20mm", padding: 0 }}></td></tr>
          </thead>
          <tbody>
            {contentBlocks.map((block) => (
              <tr key={block.id}>
                <td style={{ padding: 0 }}>
                  {renderContentBlock(block)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{ display: "table-footer-group" }}>
            <tr>
              <td style={{ padding: 0, height: "20mm", verticalAlign: "bottom" }}>
                <div
                  style={{
                    padding: "0 20mm",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  <div
                    style={{
                      borderTop: "1px solid #e5e7eb",
                      paddingTop: "4px",
                      paddingBottom: "5mm",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "8pt",
                      color: "#6b7280",
                      fontFamily: "Helvetica, Arial, sans-serif"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {logoUrl && <img src={logoUrl} style={{ height: "14px" }} alt="Logo" />}
                      <span style={{ fontWeight: "bold", color: "#374151" }}>{companyName}</span>
                    </div>
                    <div>{websiteDisplay}</div>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* ── Signature Blocks ── */}
      {signatureBlocks.map((block) => {
        const bgUrl = config.coverBackground?.url;
        return (
          /* ── Signature page ────────────────────────────────────────────
             Full-bleed (same @page cover-page rule as the cover).
             Uses flex-column layout: content in flex-1 min-h-0 overflow-hidden,
             footer as shrink-0 at the bottom. This guarantees the total height
             never exceeds A4_HEIGHT_PX, preventing ghost overflow pages. */
          <div
            key={block.id}
            className="pdf-page pdf-signature-page pdf-page-break-before"
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX - 1,
              overflow: "hidden",
              position: "relative",
              boxSizing: "border-box",
              padding: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {bgUrl && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              >
                <img
                  src={bgUrl}
                  alt="Background"
                  style={{ width: "100%", height: "100%", objectFit: "fill", opacity: 0.2 }}
                />
              </div>
            )}

            {/* Content area — flex-1 + min-h-0 + overflow-hidden ensures it never pushes footer off-page */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "hidden",
                position: "relative",
                zIndex: 10,
                width: "100%",
                padding: "20mm 20mm 0",
                boxSizing: "border-box",
              }}
            >
              <PageHeader
                proposal={proposal}
                title={block.title || "Acceptance & Sign-off"}
              />
              <div style={{ paddingTop: "4rem", paddingBottom: "1rem" }}>
                <SignatureRenderer
                  block={block}
                  proposal={proposal}
                  company={company}
                />
              </div>
            </div>

            {/* Footer — shrink-0 at the bottom, never overflows */}
            <div
              style={{
                flexShrink: 0,
                position: "relative",
                zIndex: 20,
                width: "100%",
              }}
            >
              <CoverFooter
                proposal={proposal}
                company={company}
                config={config}
                showPageNumber={false}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
