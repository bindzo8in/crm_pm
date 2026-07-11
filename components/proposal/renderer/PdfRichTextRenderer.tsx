"use client";

/**
 * PdfRichTextRenderer
 *
 * PDF-ONLY rich text renderer used exclusively by ProposalPdfRenderer.
 * - Imports proposal-pdf-renderer.css (NOT proposal-renderer.css)
 * - Uses pdf-* class names so there is zero CSS leakage from the preview renderer
 * - No screen-only footer, no preview-specific elements
 */

import React from "react";
import { generateHTML, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Image as ImageExtension } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Typography } from "@tiptap/extension-typography";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { PageBreak } from "@/components/tiptap-node/page-break-node/page-break-node-extension";
import { PageHeader } from "./templates/PageHeader";

// A4 at 96dpi
const A4_WIDTH_PX = 793;

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({ horizontalRule: false }),
  HorizontalRule,
  PageBreak,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  ImageExtension,
  Typography,
  Superscript,
  Subscript,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
];

/**
 * Splits a TipTap doc's content array at every `pageBreak` node.
 * Returns an array of content-node arrays (one per logical page section).
 */
function splitAtPageBreaks(nodes: JSONContent[]): JSONContent[][] {
  const pages: JSONContent[][] = [];
  let current: JSONContent[] = [];
  for (const node of nodes) {
    if (node.type === "pageBreak") {
      pages.push(current);
      current = [];
    } else {
      current.push(node);
    }
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

interface PdfRichTextRendererProps {
  block: {
    title: string | null;
    content?: unknown;
  };
  blockType?: string;
  backgroundUrl?: string;
  /** Services array — used to render per-page badges and watermarks in FEATURES block. */
  services?: Array<{ serviceName: string; packageName?: string | null }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  company?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposal?: any;
}

// SVG URL generator removed since we are using DOM watermark

export function PdfRichTextRenderer({
  block,
  blockType,
  backgroundUrl,
  services,
  proposal,
}: PdfRichTextRendererProps) {
  const isFeaturesBlock = blockType === "FEATURES";
  const isTermsBlock = blockType === "TERMS";

  if (!block.content || typeof block.content !== "object") return null;

  let pages: string[] = [];
  try {
    const doc = block.content as JSONContent;
    const topNodes = Array.isArray(doc.content) ? doc.content : [];
    const hasPageBreaks = topNodes.some((n) => n.type === "pageBreak");

    if (hasPageBreaks) {
      pages = splitAtPageBreaks(topNodes)
        .filter((section) => section.length > 0)
        .map((section) => generateHTML({ type: "doc", content: section }, TIPTAP_EXTENSIONS))
        .filter((html) => html.replace(/<[^>]*>/g, "").trim().length > 0);
    } else {
      const html = generateHTML(doc, TIPTAP_EXTENSIONS);
      pages = [html];
    }
  } catch (error) {
    console.error("[PdfRichTextRenderer] Failed to generate HTML:", error);
    pages = ["<p>Error rendering content.</p>"];
  }

  if (pages.length === 0) return null;

  return (
    <>
      {pages.map((html, i) => {
        const currentService = services?.[i] ?? services?.[0];
        const serviceName = isFeaturesBlock ? currentService?.serviceName : null;

        return (
          <table
            key={i}
            className="pdf-page-break-before"
            style={{ width: "100%", borderSpacing: 0, borderCollapse: "collapse" }}
          >
            <thead style={{ display: "table-header-group" }}>
              <tr>
                <td style={{ padding: "0 20mm", position: "relative", boxSizing: "border-box" }}>
                  {/* Page header repeats on every continued page! */}
                  <PageHeader
                    proposal={proposal}
                    title={block.title || (isTermsBlock ? "Terms & Conditions" : "Service Features")}
                    badge={
                      isFeaturesBlock && serviceName ? (
                        <div className="pdf-features-service-badge">{serviceName}</div>
                      ) : undefined
                    }
                  />

                  {/* Watermark repeats on every continued page!
                      Anchored to the repeating thead.
                      top: -20mm counteracts the outer table's 20mm thead gap.
                      height: 1122px forces it to span the full A4 physical page. */}
                  {isFeaturesBlock && serviceName && (
                    <div
                      className="pdf-features-watermark"
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: "-20mm",
                        right: 0,
                        height: "1122px",
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "28pt",
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: "#e5e7eb",
                        opacity: 0.45,
                        zIndex: 0,
                        pointerEvents: "none"
                      }}
                    >
                      {serviceName}
                    </div>
                  )}
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 0 }}>
                  <div
                    className="pdf-content-page"
                    style={{ width: A4_WIDTH_PX, position: "relative", boxSizing: "border-box" }}
                  >
                    {/* Optional background image (Covered by content/table background if any) */}
                    {backgroundUrl && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          zIndex: 0,
                          pointerEvents: "none",
                        }}
                      >
                        <img
                          src={backgroundUrl}
                          alt="Background"
                          style={{ width: "100%", height: "100%", objectFit: "fill", opacity: 0.2 }}
                        />
                      </div>
                    )}

                    {/* Rich text content */}
                    <div style={{ position: "relative", zIndex: 10, paddingBottom: "2rem" }}>
                      <div
                        className={`pdf-rich-text${isFeaturesBlock ? " pdf-features-rich-text" : ""}${isTermsBlock ? " pdf-terms-rich-text" : ""}`}
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        );
      })}
    </>
  );
}
