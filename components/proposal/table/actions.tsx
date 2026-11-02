"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  CheckCircle2,
  Loader2,
  Eye,
  Pencil,
  Copy,
  CopyCheck,
  CopyPlus,
  Trash2,
  ReceiptText,
  FolderKanban,
  Share2,
} from "lucide-react";

import { DeleteProposal, DuplicateProposal, manuallyAcceptProposal } from "@/actions/proposal";
import { createInvoiceFromProposal } from "@/actions/invoice";
import { proposalKeys } from "../util";
import { ProposalShareDialog } from "./share-dialog";

interface ProposalActionsProps {
  canConvertToProject: boolean;
  proposal: {
    id: string;
    status: string;
    proposalNumber: number;
    title: string;
    customerDisplayName: string;
    customerEmail: string | null;
    customerPhone: string | null;
  };
}

export function ProposalActions({
  proposal,
  canConvertToProject,
}: ProposalActionsProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const response = await manuallyAcceptProposal(proposal.id);
      if (response.success) {
        toast.success(response.message);
        await queryClient.invalidateQueries({ queryKey: proposalKeys.all });
        router.refresh();
        setIsApprovalDialogOpen(false);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error("Failed to manually accept proposal:", error);
      toast.error("Failed to accept proposal");
    } finally {
      setIsApproving(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setIsGenerating(true);
      const res = await createInvoiceFromProposal(proposal.id);
      if (res.success && res.data) {
        toast.success(res.message || "Invoice ready!");
        router.push(`/dashboard/invoices/${res.data.id}`);
      } else {
        toast.error(res.message || "Failed to generate invoice");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(proposal.id);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDuplicate = async () => {
    try {
      const response = await DuplicateProposal(proposal.id);

      if (response.success) {
        toast.success(response.message);

        queryClient.invalidateQueries({
          queryKey: proposalKeys.all,
        });
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await DeleteProposal(proposal.id);

      if (response.success) {
        toast.success(response.message);

        queryClient.invalidateQueries({
          queryKey: proposalKeys.all,
        });
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/p/${proposal.id}`}>
              <Eye />
              View
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/dashboard/proposals/${proposal.id}/preview`}>
              <Eye />
              Preview
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setIsShareDialogOpen(true)}>
            <Share2 />
            Share
          </DropdownMenuItem>

          {proposal.status === "SENT" && (
            <DropdownMenuItem onSelect={() => setIsApprovalDialogOpen(true)}>
              <CheckCircle2 />
              Mark as accepted
            </DropdownMenuItem>
          )}

          {proposal.status === "ACCEPTED" && (
            <DropdownMenuItem onClick={handleGenerateInvoice} disabled={isGenerating}>
              <ReceiptText />
              {isGenerating ? "Generating..." : "Generate Invoice"}
            </DropdownMenuItem>
          )}

          {proposal.status === "ACCEPTED" && canConvertToProject && (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/projects/new?proposalId=${proposal.id}`}>
                <FolderKanban />
                Convert to Project
              </Link>
            </DropdownMenuItem>
          )}

          {proposal.status === "DRAFT" && (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/proposals/${proposal.id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDuplicate}>
            <CopyPlus />
            Duplicate
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleCopy}>
            {copied ? <CopyCheck /> : <Copy />}
            {copied ? "Copied" : "Copy"} ID
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProposalShareDialog
        proposal={{
          id: proposal.id,
          proposalNumber: proposal.proposalNumber,
          title: proposal.title,
          customerName: proposal.customerDisplayName,
          customerEmail: proposal.customerEmail,
          status: proposal.status,
        }}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />

      <AlertDialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark proposal as accepted?</AlertDialogTitle>
            <AlertDialogDescription>
              This records a manual approval for the sent proposal. It does not record a client signature.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              asChild
            >
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  void handleApprove();
                }}
                disabled={isApproving}
                className="gap-2"
              >
                {isApproving && <Loader2 className="size-4 animate-spin" />}
                {isApproving ? "Approving…" : "Mark as accepted"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}