"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, ZoomIn, ZoomOut, Maximize, Loader2 } from "lucide-react";

interface PublicPreviewToolbarProps {
  proposalId: string;
}

export function PublicPreviewToolbar({ proposalId }: PublicPreviewToolbarProps) {
  const [zoom, setZoom] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      // Trigger the server-side Puppeteer PDF endpoint.
      const response = await fetch(`/api/proposals/${proposalId}/pdf`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[PDF] server error:", err);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${proposalId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const fitToScreen = () => {
    const screenWidth = window.innerWidth;
    // 794px is roughly 210mm at 96dpi. Leave a small padding (e.g., 32px)
    if (screenWidth < 826) {
      const scale = (screenWidth - 32) / 794;
      setZoom(Math.floor(scale * 100));
    } else {
      setZoom(100);
    }
  };

  // Auto-scale on mount
  useEffect(() => {
    fitToScreen();
  }, []);

  // Apply zoom to document wrapper
  useEffect(() => {
    const doc = document.getElementById("proposal-preview-wrapper");
    if (doc) {
      // Using CSS zoom works perfectly for shrinking the layout flow footprint
      doc.style.setProperty("zoom", `${zoom}%`);
    }
  }, [zoom]);

  return (
    <div className="proposal-preview-toolbar sticky top-0 z-50 w-full bg-white border-b shadow-sm py-2 sm:py-3 px-2 sm:px-6 flex flex-wrap items-center justify-between gap-y-2 print:hidden">
      <div className="font-semibold text-lg text-slate-800 hidden sm:block">
        Proposal View
      </div>

      <div className="flex items-center gap-1 sm:gap-2 border-x px-2 sm:px-4 mx-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setZoom(Math.max(25, zoom - 10))}
          title="Zoom Out"
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        
        <span className="text-[10px] sm:text-sm font-medium w-8 sm:w-12 text-center">{zoom}%</span>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setZoom(Math.min(200, zoom + 10))}
          title="Zoom In"
          className="h-8 w-8 sm:h-9 sm:w-9"
        >
          <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fitToScreen}
          title="Fit to Screen"
          className="h-8 w-8 sm:h-9 sm:w-9 ml-1 bg-slate-100 hover:bg-slate-200"
        >
          <Maximize className="h-3 w-3 sm:h-4 sm:w-4 text-slate-700" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 hidden sm:flex">
          <Printer className="h-4 w-4 text-gray-600" />
          Print
        </Button>
        <Button onClick={handlePrint} variant="outline" size="sm" className="sm:hidden px-2">
          <Printer className="h-4 w-4 text-gray-600" />
        </Button>

        <Button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          size="sm"
          className="gap-2 bg-blue-600 hover:bg-blue-700 hidden sm:flex"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {isDownloading ? "Generating…" : "Download PDF"}
        </Button>
        <Button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          size="sm"
          className="gap-1 bg-blue-600 hover:bg-blue-700 sm:hidden px-2"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
