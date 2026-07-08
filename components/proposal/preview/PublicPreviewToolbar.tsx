"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, ZoomIn, ZoomOut, Maximize } from "lucide-react";

export function PublicPreviewToolbar() {
  const [zoom, setZoom] = useState(100);

  const handlePrint = () => {
    window.print();
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      
      const wrapper = document.getElementById("proposal-preview-wrapper");
      const element = document.querySelector(".proposal-renderer-document") as HTMLElement;
      
      if (!wrapper || !element) return;
      
      const originalZoom = wrapper.style.getPropertyValue("zoom");
      wrapper.style.setProperty("zoom", "100%");

      // Temporarily strip the visual margin/separator between pages
      const pageEls = Array.from(element.querySelectorAll('.proposal-pdf-page')) as HTMLElement[];
      const originalMargins: string[] = pageEls.map(p => p.style.marginTop);
      pageEls.forEach(p => { p.style.marginTop = '0'; p.style.boxShadow = 'none'; });

      await new Promise(resolve => setTimeout(resolve, 300));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (pageEls.length === 0) {
        const dataUrl = await toPng(element, {
          pixelRatio: 3,
          backgroundColor: '#ffffff',
          style: { boxShadow: 'none', margin: '0', transform: 'none' },
        });
        const imgHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      } else {
        let firstPage = true;
        for (const page of pageEls) {
          if (page.offsetHeight < 5) continue;

          const dataUrl = await toPng(page, {
            pixelRatio: 3,
            backgroundColor: '#ffffff',
            style: {
              boxShadow: 'none',
              border: 'none',
              outline: 'none',
              margin: '0',
              marginTop: '0',
              transform: 'none',
              overflow: 'visible',
            },
          });

          const imgH = (page.offsetHeight * pdfWidth) / page.offsetWidth;

          if (!firstPage) pdf.addPage();
          firstPage = false;

          // Add a 1mm tolerance for floating point rounding so exact A4 pages don't tile an extra blank page
          if (imgH <= pdfHeight + 1) {
            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgH, undefined, 'FAST');
          } else {
            let yOffset = 0;
            let remaining = imgH;
            // Only add a new page if the remaining content is larger than 1mm
            while (remaining > 1) {
              if (yOffset > 0) pdf.addPage();
              pdf.addImage(dataUrl, 'PNG', 0, -(imgH - remaining), pdfWidth, imgH, undefined, 'FAST');
              remaining -= pdfHeight;
              yOffset++;
            }
          }
        }
      }
      
      pdf.save('proposal.pdf');
      
      // Restore margins and zoom
      pageEls.forEach((p, i) => {
        p.style.marginTop = originalMargins[i];
        p.style.boxShadow = '';
      });
      if (originalZoom) {
        wrapper.style.setProperty("zoom", originalZoom);
      } else {
        wrapper.style.removeProperty("zoom");
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
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

        <Button onClick={handleDownloadPdf} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 hidden sm:flex">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={handleDownloadPdf} size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 sm:hidden px-2">
          <FileDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
