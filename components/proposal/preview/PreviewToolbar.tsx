"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ClipboardCheck,
  Copy,
  FileDown,
  List,
  ZoomIn,
  ZoomOut,
  Maximize,
  MessageCircle,
  Mail,
  Loader2,
} from "lucide-react";
import { updateProposalStatus, sendProposalEmailAction } from "@/actions/proposal";
import { toast } from "sonner";
import { ProposalWorkflowNav } from "@/components/proposal/proposal-workflow-nav";
import Link from "next/link";

interface PreviewToolbarProps {
  proposalId: string;
  proposalNumber: number;
  proposalStatus: string;
  clientEmail?: string | null;
  proposalDetails: {
    title: string;
    customerName: string;
    customerCompanyName: string | null;
    currency: string;
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    validUntil: string | null;
    services: Array<{
      name: string;
      items: Array<{ name: string; quantity: number; total: number }>;
    }>;
    bankAccount: {
      bankName: string;
      accountName: string;
      accountNumber: string;
      ifscCode: string;
      swiftCode: string | null;
      upiId: string | null;
    } | null;
  };
}

export function PreviewToolbar({ proposalId, proposalNumber, proposalStatus, clientEmail, proposalDetails }: PreviewToolbarProps) {
  const [zoom, setZoom] = useState(100);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isAfterSharingOpen, setIsAfterSharingOpen] = useState(false);

  const handleCopyPublicLink = async () => {
    const publicUrl = `${window.location.origin}/p/${proposalId}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setIsLinkCopied(true);
      toast.success("Public proposal link copied");
      window.setTimeout(() => setIsLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy public proposal link:", error);
      toast.error("Could not copy the public link. Please open the public view and copy its URL.");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      // Trigger the server-side Puppeteer PDF endpoint.
      // Using fetch + blob so we can show a loading state while the server renders.
      const response = await fetch(`/api/proposals/${proposalId}/pdf`);
      if (!response.ok) {
        toast.error("Could not generate the proposal PDF. Try again.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation-${proposalNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast.error("Could not download the proposal PDF. Try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    const url = `${window.location.origin}/p/${proposalId}`;
    const formatAmount = (amount: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: proposalDetails.currency || "INR",
        maximumFractionDigits: 2,
      }).format(amount);
    const lines = [
      `Hello ${proposalDetails.customerName},`,
      "",
      `Please find proposal #${proposalNumber}: ${proposalDetails.title}`,
      ...(proposalDetails.customerCompanyName ? [`Prepared for: ${proposalDetails.customerCompanyName}`] : []),
      ...(proposalDetails.validUntil
        ? [`Valid until: ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(proposalDetails.validUntil))}`]
        : []),
      "",
      "Proposal summary:",
      ...proposalDetails.services.flatMap((service) => [
        `• ${service.name}`,
        ...service.items.map((item) => `  - ${item.name} × ${item.quantity}: ${formatAmount(item.total)}`),
      ]),
      "",
      `Subtotal: ${formatAmount(proposalDetails.subtotal)}`,
      ...(proposalDetails.discount > 0 ? [`Discount: -${formatAmount(proposalDetails.discount)}`] : []),
      `Tax: ${formatAmount(proposalDetails.tax)}`,
      `Total: ${formatAmount(proposalDetails.grandTotal)}`,
    ];

    if (proposalDetails.bankAccount) {
      const { bankName, accountName, accountNumber, ifscCode, swiftCode, upiId } = proposalDetails.bankAccount;
      lines.push("", "Payment details:", `Bank: ${bankName}`, `Account name: ${accountName}`, `Account number: ${accountNumber}`, `IFSC: ${ifscCode}`);
      if (swiftCode) lines.push(`SWIFT: ${swiftCode}`);
      if (upiId) lines.push(`UPI: ${upiId}`);
    }

    lines.push("", `View the full proposal and payment section: ${url}`);
    const text = encodeURIComponent(lines.join("\n"));
    
    // Open in a new window immediately to prevent popup blockers
    window.open(`https://wa.me/?text=${text}`, "_blank");

    // Update status in the background
    try {
      const result = await updateProposalStatus(proposalId, "SENT");
      if (!result.success) {
        toast.error(result.message || "The proposal was shared, but its status could not be updated.");
      }
    } catch (error) {
      console.error("Failed to update proposal status", error);
      toast.error("The proposal was shared, but its status could not be updated.");
    }
  };

  const handleEmailShare = async () => {
    if (!clientEmail) return;
    
    setIsSendingEmail(true);
    const url = `${window.location.origin}/p/${proposalId}`;
    
    try {
      const result = await sendProposalEmailAction(proposalId, clientEmail, url);
      if (result.success) {
        toast.success("Proposal sent successfully via email");
      } else {
        toast.error(result.message || "Failed to send email");
      }
    } catch (error) {
      toast.error("An error occurred while sending email");
      console.error(error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const fitToScreen = useCallback(() => {
    const screenWidth = window.innerWidth;
    // 794px is roughly 210mm at 96dpi. Leave a small padding (e.g., 32px)
    if (screenWidth < 826) {
      const scale = (screenWidth - 32) / 794;
      setZoom(Math.floor(scale * 100));
    } else {
      setZoom(100);
    }
  }, []);

  // Auto-scale on mount
  useEffect(() => {
    const frame = window.requestAnimationFrame(fitToScreen);
    return () => window.cancelAnimationFrame(frame);
  }, [fitToScreen]);

  // Apply zoom to document wrapper
  useEffect(() => {
    const doc = document.getElementById("proposal-preview-wrapper");
    if (doc) {
      // Using CSS zoom works perfectly for shrinking the layout flow footprint
      doc.style.setProperty("zoom", `${zoom}%`);
    }
  }, [zoom]);

  return (
    <div className="proposal-preview-toolbar relative z-50 w-full border-b bg-background shadow-sm sm:sticky sm:top-0 print:hidden">
      <div className="mx-auto w-full max-w-[1760px] px-3 pt-2 sm:px-6">
        <ProposalWorkflowNav
          proposalId={proposalId}
          activeStep={4}
          title={proposalDetails.title}
          customerName={proposalDetails.customerName}
          status={proposalStatus}
          maxAvailableStep={4}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between gap-2 px-3 py-2 sm:px-6">
        <div className="flex w-fit items-center gap-1 rounded-lg border bg-muted/20 p-1 sm:gap-2">
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

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
        {clientEmail && (
          <>
          <Button onClick={handleEmailShare} disabled={isSendingEmail} size="sm" variant="outline" className="hidden gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 sm:flex">
              {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {isSendingEmail ? "Sending..." : "Send Mail"}
            </Button>
          <Button onClick={handleEmailShare} disabled={isSendingEmail} size="icon-sm" variant="outline" aria-label="Send mail" title="Send mail" className="border-blue-200 text-blue-600 hover:bg-blue-50 sm:hidden">
              {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            </Button>
          </>
        )}
        
        <Button onClick={handleWhatsAppShare} size="sm" variant="outline" aria-label="Share on WhatsApp" className="hidden gap-2 border-green-200 text-green-600 hover:bg-green-50 sm:flex">
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button onClick={handleWhatsAppShare} size="icon-sm" variant="outline" aria-label="Share on WhatsApp" title="Share on WhatsApp" className="border-green-200 text-green-600 hover:bg-green-50 sm:hidden">
          <MessageCircle className="h-4 w-4" />
        </Button>

        <Button
          onClick={handleDownloadPdf}
          disabled={isDownloading}
          size="sm"
          className="hidden gap-2 bg-blue-600 hover:bg-blue-700 sm:flex"
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
          size="icon-sm"
          aria-label="Download PDF"
          title="Download PDF"
          className="gap-1 bg-blue-600 hover:bg-blue-700 sm:hidden px-2"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          aria-label={isAfterSharingOpen ? "Hide next steps" : "Show next steps"}
          aria-expanded={isAfterSharingOpen}
          title="Next steps"
          className="sm:hidden"
          onClick={() => setIsAfterSharingOpen((open) => !open)}
        >
          <List className="h-4 w-4" />
        </Button>
        {!clientEmail && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Add a customer email to send this proposal.
          </span>
        )}
        </div>
      </div>

      <section
        aria-labelledby="proposal-next-steps-title"
        className={`border-t bg-muted/20 px-3 py-3 sm:px-6 ${
          isAfterSharingOpen ? "block" : "hidden sm:block"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-3">
          <div className="min-w-0">
            <h2 id="proposal-next-steps-title" className="text-sm font-semibold">
              After sharing
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">
              {proposalStatus === "ACCEPTED"
                ? "This proposal is accepted. Open Proposals to create an invoice or convert it to a project."
                : proposalStatus === "SENT"
                  ? "Your client can review and accept the proposal from the public link. After acceptance, create an invoice or project from Proposals."
                  : "Share the public link with your client. They can review the proposal there; once it is sent and accepted, continue from Proposals."}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full gap-2"
              onClick={handleCopyPublicLink}
            >
              {isLinkCopied ? (
                <ClipboardCheck aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              {isLinkCopied ? "Link copied" : "Copy public link"}
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full gap-2">
              <Link href={`/p/${proposalId}`} target="_blank" rel="noopener noreferrer">
                Open public view
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="w-full gap-2">
              <Link href="/dashboard/proposals">
                <List aria-hidden="true" className="size-4" />
                Back to proposals
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
