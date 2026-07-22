export const metadata = {
  title: "Invoices",
};

import { PlusIcon } from "lucide-react";
import DashboardContainer from "../dashboard-container";
import { InvoiceQuerySchema } from "@/lib/schemas/invoice-schema";
import { getQueryClient } from "@/lib/query-client";
import { invoiceKeys } from "@/components/invoice/util";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { InvoiceTable } from "@/components/invoice/table";
import { getInvoices } from "@/actions/invoice";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  await requirePageAccess("/dashboard/invoices");
  const params = await searchParams;
  
  const initialQuery: InvoiceQuerySchema = {
    page: Number(params.page ?? 0),
    pageSize: Number(params.pageSize ?? 10),
    search: typeof params.search === "string" ? params.search : undefined,
    sortDirection: params.sortDirection === "asc" ? "asc" : "desc",
    status: params.status as any,
    customerId: params.customerId as any,
  };

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: invoiceKeys.list(initialQuery),
    queryFn: () => getInvoices(initialQuery),
  });

  return (
    <DashboardContainer
      title="Invoices"
      action={{
        href: "/dashboard/invoices/create",
        label: "Create Invoice",
        icon: <PlusIcon className="h-4 w-4" />,
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <InvoiceTable initialQuery={initialQuery} />
      </HydrationBoundary>
    </DashboardContainer>
  );
}
