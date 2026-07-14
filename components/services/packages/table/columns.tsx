import { GetServicesPackages } from "@/actions/services";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { ServicePackageActions } from "./actions";

type ServicePackageRow = NonNullable<
    Extract<Awaited<ReturnType<typeof GetServicesPackages>>, { success: true }>["data"]
>["data"][number];

export const getColumns = (currencyMode: "INR" | "USD"): ColumnDef<ServicePackageRow>[] => [
    {
        id: "name",
        accessorKey: "name",
        header: "Package",
    },

    {
        id: "service",
        accessorFn: (row) => row.service.name,
        header: "Service",
    },

    {
        id: "breakdown",
        header: "Breakdown",
        size: 350,
        cell: ({ row }) => (
            <div className="space-y-1">
                {row.original.items.map((item: any) => {
                    const price = currencyMode === "INR" ? Number(item.unitPrice) : Number(item.unitPriceUSD);
                    return (
                        <div
                            key={item.id}
                            className="flex items-center justify-between gap-4 text-sm"
                        >
                            <span className="truncate text-muted-foreground">
                                {item.name}
                                {item.quantity > 1 && (
                                    <span>
                                        {" "}
                                        × {item.quantity} {item.unit}
                                    </span>
                                )}
                            </span>

                            <span className="font-medium whitespace-nowrap">
                                {currencyMode === "USD" && price === 0 ? (
                                    "-"
                                ) : (
                                    <>
                                        {currencyMode === "INR" ? "₹" : "$"}
                                        {(price * item.quantity).toLocaleString(
                                            currencyMode === "INR" ? "en-IN" : "en-US"
                                        )}
                                    </>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        ),
    },

    {
        id: "totalPrice",
        accessorKey: "totalPrice",
        header: () => (
            <div className="text-right">
                Total Price
            </div>
        ),
        cell: ({ row }) => {
            const total = currencyMode === "INR" ? Number(row.original.totalPrice) : Number(row.original.totalPriceUSD);
            return (
                <div className="text-right font-semibold">
                    {currencyMode === "USD" && total === 0 ? (
                        "-"
                    ) : (
                        <>
                            {currencyMode === "INR" ? "₹" : "$"} 
                            {total.toLocaleString(
                                currencyMode === "INR" ? "en-IN" : "en-US"
                            )}
                        </>
                    )}
                </div>
            );
        },
    },

    {
        id: "isPopular",
        accessorKey: "isPopular",
        header: "Popular",
        cell: ({ row }) =>
            row.original.isPopular ? (
                <Badge>Popular</Badge>
            ) : (
                <Badge
                    variant="secondary"
                    className="text-muted-foreground"
                >
                    No
                </Badge>
            ),
    },

    {
        id: "isActive",
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) =>
            row.original.isActive ? (
                <Badge>Active</Badge>
            ) : (
                <Badge variant="destructive">
                    Inactive
                </Badge>
            ),
    },

    {
        id: "actions",
        cell: ({ row }) => (
            <ServicePackageActions
                servicePackage={row.original}
            />
        ),
    },
];