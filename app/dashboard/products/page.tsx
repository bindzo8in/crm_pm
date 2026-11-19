export const metadata = { title: "Products" };

import { getProducts } from "@/actions/products";
import { ProductsTable } from "@/components/products/table";
import { productKeys } from "@/components/products/util";
import { getQueryClient } from "@/lib/query-client";
import { requirePageAccess } from "@/lib/auth-guard";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import DashboardContainer from "../dashboard-container";
import { PlusIcon } from "lucide-react";
import type { ProductQuerySchema } from "@/lib/schemas/product-schema";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/dashboard/products">) {
  await requirePageAccess("/dashboard/products");
  const params = await searchParams;
  const initialQuery: ProductQuerySchema = {
    page: Math.max(0, Number(params.page ?? 0) || 0),
    pageSize: Math.min(100, Math.max(1, Number(params.pageSize ?? 10) || 10)),
    search: typeof params.search === "string" ? params.search : undefined,
    isActive: params.isActive === "true" ? true : undefined,
    sortDirection: params.sortDirection === "asc" ? "asc" : "desc",
  };

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: productKeys.list(initialQuery),
    queryFn: () => getProducts(initialQuery),
  });

  return (
    <DashboardContainer
      title="Products"
      action={{
        href: "/dashboard/products/create",
        icon: <PlusIcon />,
        label: "Add product",
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProductsTable initialQuery={initialQuery} />
      </HydrationBoundary>
    </DashboardContainer>
  );
}
