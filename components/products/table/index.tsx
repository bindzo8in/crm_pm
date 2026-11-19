"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { getProducts } from "@/actions/products";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import type { ProductQuerySchema } from "@/lib/schemas/product-schema";
import { columns } from "./columns";
import { productKeys } from "../util";

export function ProductsTable({
  initialQuery,
}: {
  initialQuery: ProductQuerySchema;
}) {
  const [search, setSearch] = useState(initialQuery.search ?? "");
  const [isActive, setIsActive] = useState(initialQuery.isActive ?? false);
  const [pagination, setPagination] = useState({
    pageIndex: initialQuery.page,
    pageSize: initialQuery.pageSize,
  });
  const debouncedSearch = useDebounce(search, 400).trim() || undefined;
  const query = {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: debouncedSearch,
    isActive: isActive ? true : undefined,
    sortDirection: initialQuery.sortDirection,
  } satisfies ProductQuerySchema;

  const { data, isPending, isError } = useQuery({
    queryKey: productKeys.list(query),
    queryFn: () => getProducts(query),
  });

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          aria-label="Search products"
          placeholder="Search products or SKU..."
          value={search}
          className="h-11 w-full min-w-0 sm:max-w-sm"
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
        />
        <div className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 sm:w-auto">
          <Checkbox
            id="show-active-products"
            checked={isActive}
            onCheckedChange={(checked) => {
              setIsActive(checked === true);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
          />
          <label htmlFor="show-active-products" className="cursor-pointer text-sm">
            Show active products only
          </label>
        </div>
      </div>

      {isPending ? (
        <div role="status" className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Loading products
        </div>
      ) : isError || !data?.success ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{data?.success === false ? data.message : "Products could not be loaded. Try again."}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data.data?.data ?? []}
          total={data.data?.pagination.total ?? 0}
          emptyMessage={debouncedSearch ? "No products match your search." : "No products found."}
          pagination={pagination}
          onPaginationChange={setPagination}
          mobileTitleColumnId="name"
        />
      )}
    </section>
  );
}
