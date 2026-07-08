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
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  CopyCheck,
  CopyPlus,
  Trash2,
} from "lucide-react";

import { DeleteProposal, DuplicateProposal } from "@/actions/proposal";
import { proposalKeys } from "../util";

interface ProposalActionsProps {
  proposal: {
    id: string;
    status: string;
  };
}

export function ProposalActions({
  proposal,
}: ProposalActionsProps) {
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);

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
  );
}