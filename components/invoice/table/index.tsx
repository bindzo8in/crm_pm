"use client";

import { useQuery } from "@tanstack/react-query";
import { columns } from "./columns";
import { DataTable } from "@/components/data-table";
import { getInvoices } from "@/actions/invoice";
import { invoiceKeys } from "../util";
import { InvoiceQuerySchema } from "@/lib/schemas/invoice-schema";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceStatus } from "@/app/generated/prisma/client";

interface InvoiceTableProps {
  initialQuery: InvoiceQuerySchema;
}

export function InvoiceTable({ initialQuery }: InvoiceTableProps) {
  const [query, setQuery] = useState<InvoiceQuerySchema>(initialQuery);

  const { data, isLoading } = useQuery({
    queryKey: invoiceKeys.list(query),
    queryFn: () => getInvoices(query),
  });

  const responseData = data?.success ? data.data : null;
  const items = responseData?.items || [];
  const totalCount = responseData?.totalCount || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Input
          placeholder="Search invoices by title or customer..."
          value={query.search || ""}
          onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value, page: 0 }))}
          className="max-w-sm"
        />
        <Select
          value={query.status || "ALL"}
          onValueChange={(val) =>
            setQuery((prev) => ({
              ...prev,
              status: val === "ALL" ? undefined : (val as InvoiceStatus),
              page: 0,
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns as any}
        data={items}
        total={totalCount}
        pagination={{
          pageIndex: query.page,
          pageSize: query.pageSize,
        }}
        onPaginationChange={(updater) => {
          if (typeof updater === "function") {
            const next = updater({ pageIndex: query.page, pageSize: query.pageSize });
            setQuery((prev) => ({ ...prev, page: next.pageIndex, pageSize: next.pageSize }));
          } else {
            setQuery((prev) => ({ ...prev, page: updater.pageIndex, pageSize: updater.pageSize }));
          }
        }}
      />
    </div>
  );
}
