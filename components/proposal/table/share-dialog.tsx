"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Check,
  Copy,
  Mail,
  MessageCircle,
  Share2,
} from "lucide-react";

import { sendProposalEmailAction, updateProposalStatus } from "@/actions/proposal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { proposalKeys } from "../util";

interface ProposalShareDialogProps {
  proposal: {
    id: string;
    proposalNumber: number;
    title: string;
    customerName: string;
    customerEmail: string | null;
    status: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalShareDialog({
  proposal,
  open,
  onOpenChange,
}: ProposalShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);
  const queryClient = useQueryClient();
  const publicPath = `/p/${proposal.id}`;
  const getPublicUrl = () => `${window.location.origin}${publicPath}`;
  const canSend = proposal.status === "DRAFT" || proposal.status === "SENT";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getPublicUrl());
      setCopied(true);
      toast.success("Public proposal link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy proposal link:", error);
      toast.error("Could not copy the proposal link");
    }
  };

  const handleSendEmail = async () => {
    if (!proposal.customerEmail || !canSend || isSendingEmail) return;

    setIsSendingEmail(true);
    try {
      const result = await sendProposalEmailAction(
        proposal.id,
        proposal.customerEmail,
        getPublicUrl(),
      );
      if (!result.success) {
        toast.error(result.message || "Could not send proposal email");
        return;
      }

      toast.success(`Proposal sent to ${proposal.customerEmail}`);
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: proposalKeys.all });
    } catch (error) {
      console.error("Failed to send proposal email:", error);
      toast.error("Could not send proposal email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!canSend || isOpeningWhatsApp) return;

    const message = [
      `Hello ${proposal.customerName},`,
      "",
      `Please review proposal QUOT-${proposal.proposalNumber}${proposal.title ? `: ${proposal.title}` : ""}.`,
      getPublicUrl(),
    ].join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );

    if (proposal.status === "DRAFT") {
      setIsOpeningWhatsApp(true);
      try {
        const result = await updateProposalStatus(proposal.id, "SENT");
        if (!result.success) {
          toast.error(`The share window opened, but the proposal status was not updated: ${result.message}`);
          return;
        }
        await queryClient.invalidateQueries({ queryKey: proposalKeys.all });
      } catch (error) {
        console.error("Failed to update proposal status after sharing:", error);
        toast.error("The share window opened, but the proposal status was not updated.");
      } finally {
        setIsOpeningWhatsApp(false);
      }
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Share2 aria-hidden="true" className="size-5" />
          </div>
          <DialogTitle>Share proposal</DialogTitle>
          <DialogDescription>
            Send QUOT-{proposal.proposalNumber} to {proposal.customerName}, or copy its public link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={`proposal-share-url-${proposal.id}`} className="text-sm font-medium">
              Public proposal link
            </label>
            <div className="flex gap-2">
              <Input
                id={`proposal-share-url-${proposal.id}`}
                value={publicPath}
                readOnly
                className="min-w-0"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" variant="outline" onClick={handleCopyLink} className="shrink-0 gap-2">
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy link"}</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleSendEmail}
              disabled={!proposal.customerEmail || !canSend || isSendingEmail}
              className="gap-2"
            >
              <Mail aria-hidden="true" className="size-4" />
              {isSendingEmail ? "Sending email..." : "Send by email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleWhatsApp}
              disabled={!canSend || isOpeningWhatsApp}
              className="gap-2"
            >
              <MessageCircle aria-hidden="true" className="size-4" />
              {isOpeningWhatsApp ? "Opening WhatsApp..." : "Share on WhatsApp"}
            </Button>
          </div>

          {!proposal.customerEmail && canSend && (
            <p className="text-xs text-muted-foreground">
              No email is saved for this customer. Copy the link or share it on WhatsApp.
            </p>
          )}
          {!canSend && (
            <p className="text-xs text-muted-foreground">
              This proposal is {proposal.status.toLowerCase()}. Sharing by email or WhatsApp is unavailable to preserve its status.
            </p>
          )}

          <div className="flex justify-end border-t pt-3">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href={`/p/${proposal.id}`} target="_blank" rel="noopener noreferrer">
                Open public view
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
