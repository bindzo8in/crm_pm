"use client";

import Link from "next/link";
import { useState } from "react";
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
  FileText,
  Receipt,
  FolderKanban,
  Copy,
  CopyCheck,
  Trash2,
} from "lucide-react";
import { DeleteCustomer } from "@/actions/customer";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { customerKeys } from "@/components/customers/customer-query-key";

interface CustomerActionsProps {
  customer: {
    id: string;
    displayName: string;
  };
}

export function CustomerActions({
  customer,
}: CustomerActionsProps) {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(customer.id);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDelete = async () => {
    try {
      const response = await DeleteCustomer(customer.id);
      if ("success" in response && response.success) {
        await queryClient.invalidateQueries({ queryKey: customerKeys.all });
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.log(error);
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
          <Link href={`/dashboard/customers/${customer.id}`}>
            <Eye />
            View
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/customers/${customer.id}/edit`}
          >
            <Pencil />
            Edit
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/proposals/new?customerId=${customer.id}`}
          >
            <FileText />
            Create Proposal
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/invoices/new?customerId=${customer.id}`}
          >
            <Receipt />
            Create Invoice
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/projects/new?customerId=${customer.id}`}
          >
            <FolderKanban />
            Create Project
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <CopyCheck /> : <Copy />}
          {copied ? "Copied" : "Copy"} ID
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}