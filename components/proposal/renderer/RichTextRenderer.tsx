"use client";

import React, { useState, useEffect } from "react";
import { generateHTML } from "@tiptap/react";
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
  /** When true the component is already inside a proposal-pdf-page wrapper.
   *  When the content contains pageBreak nodes it will render multiple pages itself. */
  insidePage?: boolean;
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
 * Returns an array of content-node arrays (one per page).
 */
function splitAtPageBreaks(nodes: unknown[]): unknown[][] {
  const pages: unknown[][] = [];
  let current: unknown[] = [];
  for (const node of nodes) {
    if ((node as { type: string }).type === "pageBreak") {
      pages.push(current);
      current = [];
    } else {
      current.push(node);
    }
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

export function RichTextRenderer({ block, insidePage }: RichTextRendererProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!block.content || typeof block.content !== "object") {
      setPages([]);
      return;
    }

    try {
      const doc = block.content as { type: string; content?: unknown[] };
      const topNodes = Array.isArray(doc.content) ? doc.content : [];

      // Check whether this document has any pageBreak nodes
      const hasPageBreaks = topNodes.some(
        (n) => (n as { type: string }).type === "pageBreak"
      );

      if (hasPageBreaks) {
        const pageSections = splitAtPageBreaks(topNodes);
        const htmlPages = pageSections
          // Filter out empty sections (e.g. a trailing pageBreak produces an empty array)
          .filter((section) => section.length > 0)
          .map((section) => {
            const subDoc = { type: "doc", content: section };
            return generateHTML(subDoc, TIPTAP_EXTENSIONS);
          })
          // Also filter out sections that only produce whitespace HTML
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

  // Every page section — whether one or many — gets its own proposal-pdf-page wrapper.
  // This is REQUIRED so the PDF generator can screenshot each page individually.
  // The multi-page case (feature groups split by pageBreak) naturally produces multiple divs.
  // The single-page case (terms, custom, signature content) produces exactly one div.
  return (
    <>
      {pages.map((html, i) => (
        <div
          key={i}
          className="proposal-pdf-page proposal-page-content"
          style={{ width: "210mm", minHeight: "297mm", background: "white" }}
        >
          {/* Only show the block-level title on the first page of multi-page blocks */}
          {i === 0 && block.title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">{block.title}</h2>
          )}
          <div
            className="proposal-rich-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ))}
    </>
  );
}

