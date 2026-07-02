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

import "./proposal-renderer.css";

interface RichTextRendererProps {
  block: {
    title: string | null;
    content?: unknown;
  };
}

export function RichTextRenderer({ block }: RichTextRendererProps) {
  const [contentHTML, setContentHTML] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (!block.content || typeof block.content !== "object") {
      setContentHTML("");
      return;
    }
    
    try {
      const html = generateHTML(block.content as Record<string, unknown>, [
        StarterKit.configure({ horizontalRule: false }),
        HorizontalRule,
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
      ]);
      setContentHTML(html);
    } catch (error) {
      console.error("Failed to generate HTML from TipTap JSON:", error);
      setContentHTML("<p>Error rendering content.</p>");
    }
  }, [block.content]);

  if (!mounted || !contentHTML) {
    return null;
  }

  return (
    <div className="mb-16">
      {block.title && (
        <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">{block.title}</h2>
      )}
      <div 
        className="proposal-rich-text"
        dangerouslySetInnerHTML={{ __html: contentHTML }} 
      />
    </div>
  );
}
