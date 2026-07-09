"use client";

import React, { useState, useEffect } from "react";
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
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { PageBreak } from "@/components/tiptap-node/page-break-node/page-break-node-extension";

import "./proposal-renderer.css";

interface RichTextRendererProps {
  block: {
    title: string | null;
    content?: unknown;
  };
  blockType?: string;
  backgroundUrl?: string;
  /** Services array — used to render per-page badges and watermarks in FEATURES block. */
  services?: Array<{ serviceName: string; packageName?: string | null }>;
  /** @deprecated kept for prop compat — no longer used */
  isFirstBlock?: boolean;
}

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
  ImageUploadNode,
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

export function RichTextRenderer({
  block,
  blockType,
  backgroundUrl,
  services,
}: RichTextRendererProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const isFeaturesBlock = blockType === "FEATURES";
  const isTermsBlock = blockType === "TERMS";
  const useTableLayout = isFeaturesBlock || isTermsBlock;

  useEffect(() => {
    setMounted(true);
    if (!block.content || typeof block.content !== "object") {
      setPages([]);
      return;
    }

    try {
      const doc = block.content as JSONContent;
      const topNodes = Array.isArray(doc.content) ? doc.content : [];

      const hasPageBreaks = topNodes.some((n) => n.type === "pageBreak");

      if (hasPageBreaks) {
        const pageSections = splitAtPageBreaks(topNodes);
        const htmlPages = pageSections
          .filter((section) => section.length > 0)
          .map((section) => {
            const subDoc: JSONContent = { type: "doc", content: section };
            return generateHTML(subDoc, TIPTAP_EXTENSIONS);
          })
          .filter((html) => html.replace(/<[^>]*>/g, "").trim().length > 0);
        setPages(htmlPages);
      } else {
        const html = generateHTML(doc, TIPTAP_EXTENSIONS);
        setPages([html]);
      }
    } catch (error) {
      console.error("Failed to generate HTML from TipTap JSON:", error);
      setPages(["<p>Error rendering content.</p>"]);
    }
  }, [block.content]);

  if (!mounted || pages.length === 0) {
    return null;
  }

  return (
    <>
      {pages.map((html, i) => {
        // Find the service/package name for this specific page (service)
        const currentService = services?.[i] ?? services?.[0];
        const serviceName = isFeaturesBlock ? currentService?.serviceName : null;
        const packageName = isFeaturesBlock ? currentService?.packageName : null;

        return (
        <div
          key={i}
          className="proposal-pdf-page proposal-page-break-before proposal-page-content relative"
          style={{ width: "210mm" }}
        >
          {useTableLayout ? (
            <table style={{ width: "100%", borderCollapse: "collapse", border: "none", pageBreakInside: "auto", marginBottom: "-2px" }}>
              <thead style={{ display: "table-header-group" }}>
                <tr>
                  <th style={{ padding: 0, fontWeight: "normal", textAlign: "left" }}>
                    <div style={{ position: "relative" }}>
                      {/* Optional background image repeated on every page */}
                      {backgroundUrl && (
                        <div
                          className="absolute z-0 pointer-events-none"
                          style={{ top: "-20mm", left: "-20mm", width: "210mm", height: "297mm" }}
                        >
                          <img
                            src={backgroundUrl}
                            alt="Background"
                            className="w-full h-full object-fill opacity-20"
                          />
                        </div>
                      )}

                      {/* ── Right-side vertical watermark (repeats on every page) ── */}
                      {isFeaturesBlock && serviceName && (
                        <div
                          className="proposal-features-watermark"
                          aria-hidden="true"
                          style={{ top: 0, bottom: "auto", height: "257mm" }}
                        >
                          {serviceName}
                        </div>
                      )}

                      {/* ── Page header: title + service name badge ── */}
                      <div className="proposal-features-header relative z-10">
                        {/* Heading — shown on EVERY page */}
                        <h2 className="proposal-features-title">
                          {block.title || (isTermsBlock ? "Terms & Conditions" : "Service Features")}
                        </h2>
                        {/* Service name badge — top-right (FEATURES ONLY) */}
                        {isFeaturesBlock && serviceName && (
                          <div className="proposal-features-service-badge">
                            {serviceName}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ pageBreakInside: "avoid", pageBreakAfter: "auto" }}>
                  <td style={{ padding: 0, verticalAlign: "top" }}>
                    <div className="relative z-10">
                      <div
                        className={`proposal-rich-text ${
                          isFeaturesBlock ? "proposal-features-rich-text" : ""
                        } ${isTermsBlock ? "proposal-terms-rich-text" : ""}`}
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <>
              {/* Non-FEATURES block rendering */}
              {backgroundUrl && (
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                  <img
                    src={backgroundUrl}
                    alt="Background"
                    className="w-full h-full object-fill opacity-20"
                  />
                </div>
              )}
              <div className="relative z-10">
                {i === 0 && block.title && (
                  <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">
                    {block.title}
                  </h2>
                )}
                <div
                  className="proposal-rich-text"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </>
          )}
        </div>
      )})}
    </>
  );
}
