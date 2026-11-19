import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ProductActions } from "./actions";
import { getProducts } from "@/actions/products";

type ProductRow = NonNullable<
  Extract<Awaited<ReturnType<typeof getProducts>>, { success: true }>["data"]
>["data"][number];

const formatPrice = (value: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const columns: ColumnDef<ProductRow>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.original.name}</p>
        {row.original.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    id: "sku",
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => row.original.sku || <span className="text-muted-foreground">—</span>,
  },
  {
    id: "price",
    header: "Base price",
    cell: ({ row }) => (
      <div className="space-y-0.5 tabular-nums">
        <p>{formatPrice(row.original.basePrice, "INR", "en-IN")}</p>
        <p className="text-xs text-muted-foreground">{formatPrice(row.original.basePriceUSD, "USD", "en-US")}</p>
      </div>
    ),
  },
  {
    id: "taxRate",
    accessorKey: "taxRate",
    header: "Tax",
    cell: ({ row }) => `${row.original.taxRate}%`,
  },
  {
    id: "isActive",
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ProductActions product={row.original} />,
  },
];
