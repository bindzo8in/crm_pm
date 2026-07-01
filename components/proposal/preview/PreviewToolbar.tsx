"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileDown, ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface PreviewToolbarProps {
  proposalId: string;
}

export function PreviewToolbar({ proposalId }: PreviewToolbarProps) {
  const [zoom, setZoom] = useState(100);

  const handlePrint = () => {
    window.print();
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    // The native browser print engine handles modern CSS properly.
    // The @page { margin: 0 } CSS rule removes browser headers/footers.
    window.print();
  };

  // Allow zoom controls to affect the document wrapper if needed, 
  // though for print previews CSS zoom or transform scale is often used.
  useEffect(() => {
    const doc = document.getElementById("proposal-preview-wrapper");
    if (doc) {
      doc.style.transform = `scale(${zoom / 100})`;
      doc.style.transformOrigin = "top center";
    }
  }, [zoom]);

  return (
    <div className="proposal-preview-toolbar sticky top-0 z-50 w-full bg-white border-b shadow-sm py-3 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/dashboard/proposals/${proposalId}/composer`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Composer
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 border-l border-r px-4 mx-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setZoom(Math.max(50, zoom - 10))}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setZoom(Math.min(150, zoom + 10))}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setZoom(100)}
          title="Reset Zoom"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4 text-gray-600" />
          Print
        </Button>
        <Button onClick={handleDownloadPdf} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}
