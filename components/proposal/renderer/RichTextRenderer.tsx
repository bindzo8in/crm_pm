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
import { PageHeader } from "./templates/PageHeader";
import { PageFooter } from "./templates/PageFooter";

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
  company?: any;
  proposal?: any;
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
  company,
  proposal,
}: RichTextRendererProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const isFeaturesBlock = blockType === "FEATURES";
  const isTermsBlock = blockType === "TERMS";

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
        const currentService = services?.[i] ?? services?.[0];
        const serviceName = isFeaturesBlock
          ? (currentService?.packageName
              ? (currentService.packageName.trim().toLowerCase() === currentService.serviceName.trim().toLowerCase()
                  ? currentService.serviceName
                  : `${currentService.serviceName} (${currentService.packageName})`)
              : currentService?.serviceName)
          : null;

        return (
          <div
            key={i}
            className="proposal-pdf-page proposal-page-break-before proposal-page-content relative"
            style={{ width: "210mm" }}
          >
            {/* Optional background image */}
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

            {/* Page header */}
            <PageHeader
              proposal={proposal}
              title={block.title || (isTermsBlock ? "Terms & Conditions" : "Service Features")}
              badge={
                isFeaturesBlock && serviceName ? (
                  <div className="proposal-features-service-badge">{serviceName}</div>
                ) : undefined
              }
            />

            {/* Right-side vertical watermark */}
            {isFeaturesBlock && serviceName && (
              <div
                className="proposal-features-watermark"
                aria-hidden="true"
                style={{ top: 0, bottom: "auto", height: "257mm" }}
              >
                {serviceName}
              </div>
            )}

            {/* Rich text content */}
            <div className="relative z-10 pb-8">
              <div
                className={`proposal-rich-text ${
                  isFeaturesBlock ? "proposal-features-rich-text" : ""
                } ${isTermsBlock ? "proposal-terms-rich-text" : ""}`}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>

            {/* Screen-only footer (in print, Puppeteer footerTemplate handles it) */}
            <div className="screen-only absolute bottom-0 left-0 w-full px-[20mm] z-10">
              <PageFooter company={company} proposal={proposal} />
            </div>
          </div>
        );
      })}
    </>
  );
}
