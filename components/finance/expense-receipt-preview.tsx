"use client";

import * as React from "react";
import { Download, Eye, FileText, Image as ImageIcon, X } from "lucide-react";

import { ExpensePdfViewer } from "@/components/finance/expense-pdf-viewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ExpenseReceiptPreview({
  src,
  downloadUrl,
  transactionNumber,
  contentType,
}: {
  src: string;
  downloadUrl: string;
  transactionNumber: string;
  contentType: "application/pdf" | "image";
}) {
  const isPdf = contentType === "application/pdf";

  return (
    <Dialog>
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
            {isPdf ? (
              <FileText className="size-5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Receipt or invoice</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isPdf ? "PDF document" : "Image"} · {transactionNumber}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <DialogTrigger asChild>
            <Button type="button" size="sm">
              <Eye aria-hidden="true" />
              Preview
            </Button>
          </DialogTrigger>
          <Button asChild size="sm" variant="outline">
            <a href={downloadUrl}>
              <Download aria-hidden="true" />
              Download
            </a>
          </Button>
        </div>
      </div>

      <DialogContent
        showCloseButton={false}
        className="flex h-[92dvh] max-h-[92dvh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-6xl"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="truncate">Receipt preview</DialogTitle>
            <DialogDescription className="mt-1 truncate">
              {transactionNumber} · {isPdf ? "PDF document" : "Image"}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={downloadUrl}>
                <Download aria-hidden="true" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>
            <DialogClose asChild>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Close preview">
                <X aria-hidden="true" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        {isPdf ? (
          <ExpensePdfViewer src={src} className="h-full w-full" />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/50 p-4 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Receipt for ${transactionNumber}`}
              className="max-h-full max-w-full rounded-sm bg-white object-contain shadow-sm"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
