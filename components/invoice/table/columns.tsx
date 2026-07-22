"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EyeIcon, MoreHorizontalIcon, Trash2Icon, CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { softDeleteInvoice, updateInvoiceStatus } from "@/actions/invoice";
import { invoiceKeys } from "../util";
import { InvoiceStatus } from "@/app/generated/prisma/client";

export type InvoiceRow = {
  id: string;
  invoiceNumber: number;
  customerDisplayName: string;
  customerCompanyName: string | null;
  title: string;
  status: InvoiceStatus;
  issueDate: string | Date;
  dueDate: string | Date | null;
  currency: string;
  grandTotal: number;
  amountPaid: number;
  customer: {
    id: string;
    displayName: string;
    companyName: string | null;
  };
};

export const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/invoices/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        INV-{String(row.original.invoiceNumber).padStart(4, "0")}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    id: "customer",
    header: "Customer",
    accessorFn: (row) =>
      row.customerCompanyName
        ? `${row.customerDisplayName} (${row.customerCompanyName})`
        : row.customerDisplayName,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
      if (status === "PAID") variant = "default";
      if (status === "PARTIALLY_PAID") variant = "secondary";
      if (status === "OVERDUE" || status === "VOID") variant = "destructive";

      return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
    },
  },
  {
    accessorKey: "dueDate",
    header: "Due Date",
    cell: ({ row }) =>
      row.original.dueDate
        ? new Date(row.original.dueDate).toLocaleDateString("en-IN")
        : "—",
  },
  {
    accessorKey: "grandTotal",
    header: () => <div className="text-right">Total Amount</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {row.original.currency} {row.original.grandTotal.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    ),
  },
  {
    accessorKey: "amountPaid",
    header: () => <div className="text-right">Paid</div>,
    cell: ({ row }) => {
      const balance = row.original.grandTotal - row.original.amountPaid;
      return (
        <div className="text-right font-medium">
          <span className="text-emerald-600 dark:text-emerald-400">
            {row.original.currency} {row.original.amountPaid.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
          {balance > 0 && (
            <div className="text-xs text-muted-foreground">
              Due: {row.original.currency} {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <InvoiceActions row={row.original} />,
  },
];

function InvoiceActions({ row }: { row: InvoiceRow }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteInvoice(row.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: InvoiceStatus) => updateInvoiceStatus(row.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/invoices/${row.id}`} className="cursor-pointer">
            <EyeIcon className="mr-2 h-4 w-4" /> View Invoice
          </Link>
        </DropdownMenuItem>

        {row.status === "DRAFT" && (
          <DropdownMenuItem
            onClick={() => statusMutation.mutate("SENT")}
            className="cursor-pointer text-blue-600"
          >
            <CheckCircle2Icon className="mr-2 h-4 w-4" /> Mark as Sent
          </DropdownMenuItem>
        )}

        {row.status !== "PAID" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => deleteMutation.mutate()}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2Icon className="mr-2 h-4 w-4" /> Delete Invoice
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
