"use client";

import * as React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, LoaderCircle, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function PdfPageCanvas({
  document,
  pageNumber,
  containerWidth,
  zoom,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  containerWidth: number;
  zoom: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (containerWidth <= 0) return;

    let cancelled = false;
    let cancelRender: (() => void) | undefined;

    async function renderPage() {
      try {
        const page = await document.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = Math.min(1.9, Math.max(0.1, (containerWidth - 32) / baseViewport.width));
        const scale = fitScale * zoom;
        const outputScale = Math.min(window.devicePixelRatio || 1, 1.5);
        const viewport = page.getViewport({ scale: scale * outputScale });
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas rendering is unavailable.");

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(baseViewport.width * scale)}px`;
        canvas.style.height = `${Math.floor(baseViewport.height * scale)}px`;

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          background: "#ffffff",
        });
        cancelRender = () => renderTask.cancel();
        await renderTask.promise;
      } catch (error) {
        if (cancelled) return;
        console.error("Could not render expense PDF page", { pageNumber, error });
        setFailed(true);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      cancelRender?.();
    };
  }, [containerWidth, document, pageNumber, zoom]);

  if (failed) {
    return (
      <p role="alert" className="px-4 py-8 text-center text-sm text-destructive">
        This PDF page could not be displayed.
      </p>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-label={`PDF page ${pageNumber}`}
      className="mx-auto block bg-white shadow-sm"
    />
  );
}

export function ExpensePdfViewer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [viewer, setViewer] = React.useState<{
    src: string;
    document: PDFDocumentProxy | null;
    error: boolean;
  }>({ src, document: null, error: false });
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [scrollContainer, setScrollContainer] = React.useState<HTMLDivElement | null>(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    let active = true;
    let loadingTask: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;

    void import("pdfjs-dist")
      .then((pdfjs) => {
        if (!active) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        loadingTask = pdfjs.getDocument({ url: src });
        return loadingTask.promise;
      })
      .then((document) => {
        if (!document) return;
        if (active) {
          setViewer({ src, document, error: false });
          setPageNumber(1);
          setZoom(1);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Could not open expense PDF", error);
        setViewer({ src, document: null, error: true });
      });

    return () => {
      active = false;
      void loadingTask?.destroy();
    };
  }, [src]);

  React.useEffect(() => {
    if (!scrollContainer) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(scrollContainer);
    return () => observer.disconnect();
  }, [scrollContainer]);

  const document = viewer.src === src ? viewer.document : null;
  const loading = viewer.src !== src || (!viewer.document && !viewer.error);

  const scrollToPage = React.useCallback((targetPage: number) => {
    const pageElement = scrollContainer?.querySelector<HTMLElement>(
      `[data-pdf-page="${targetPage}"]`,
    );
    pageElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPageNumber(targetPage);
  }, [scrollContainer]);

  React.useEffect(() => {
    if (!scrollContainer || !document) return;

    let frame = 0;
    const updateCurrentPage = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const hasScrollableContent =
          scrollContainer.scrollHeight > scrollContainer.clientHeight + 2;
        const atBottom =
          hasScrollableContent &&
          scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - 2;
        let visiblePage = atBottom ? document.numPages : 1;
        const anchorTop = scrollContainer.getBoundingClientRect().top + 72;

        if (hasScrollableContent && !atBottom) {
          scrollContainer.querySelectorAll<HTMLElement>("[data-pdf-page]").forEach((page) => {
            if (page.getBoundingClientRect().top <= anchorTop) {
              visiblePage = Number(page.dataset.pdfPage);
            }
          });
        }

        setPageNumber((current) => current === visiblePage ? current : visiblePage);
      });
    };

    scrollContainer.addEventListener("scroll", updateCurrentPage, { passive: true });
    updateCurrentPage();
    return () => {
      scrollContainer.removeEventListener("scroll", updateCurrentPage);
      cancelAnimationFrame(frame);
    };
  }, [document, scrollContainer]);

  return (
    <div
      ref={setScrollContainer}
      className={cn("min-h-0 flex-1 overflow-auto bg-muted/50 p-4 sm:p-6", className)}
      aria-label="PDF preview"
    >
      {loading ? (
        <div className="flex h-full min-h-64 items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" aria-label="Loading PDF" />
        </div>
      ) : viewer.error ? (
        <p role="alert" className="py-12 text-center text-sm text-destructive">
          This PDF could not be displayed.
        </p>
      ) : document ? (
        <div className="mx-auto flex min-h-full max-w-[90rem] flex-col">
          <nav
            aria-label="PDF controls"
            className="sticky top-0 z-10 mx-auto mb-4 flex items-center gap-1 rounded-lg border bg-background/95 p-1 shadow-sm backdrop-blur"
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Previous PDF page"
              disabled={pageNumber <= 1}
              onClick={() => scrollToPage(Math.max(1, pageNumber - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-20 px-1 text-center text-xs tabular-nums">
              {pageNumber} / {document.numPages}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Next PDF page"
              disabled={pageNumber >= document.numPages}
              onClick={() => scrollToPage(Math.min(document.numPages, pageNumber + 1))}
            >
              <ChevronRight />
            </Button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Zoom out"
              disabled={zoom <= 0.6}
              onClick={() => setZoom((current) => Math.max(0.6, Math.round((current - 0.2) * 10) / 10))}
            >
              <ZoomOut />
            </Button>
            <span className="min-w-10 text-center text-xs tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Zoom in"
              disabled={zoom >= 2.4}
              onClick={() => setZoom((current) => Math.min(2.4, Math.round((current + 0.2) * 10) / 10))}
            >
              <ZoomIn />
            </Button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Fit PDF page to viewer"
              onClick={() => setZoom(1)}
            >
              <Maximize />
              Fit
            </Button>
          </nav>
          <div className="flex flex-col items-center gap-4 pb-4">
            {Array.from({ length: document.numPages }, (_, index) => {
              const currentPage = index + 1;
              return (
                <div
                  key={`${src}:${currentPage}`}
                  data-pdf-page={currentPage}
                  className="w-full scroll-mt-20"
                >
                  <PdfPageCanvas
                    document={document}
                    pageNumber={currentPage}
                    containerWidth={containerWidth}
                    zoom={zoom}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
