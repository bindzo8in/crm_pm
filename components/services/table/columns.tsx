import { GetServices } from "@/actions/services";
import { ColumnDef } from "@tanstack/react-table";
import { ServiceActions } from "./actions";
import { Badge } from "@/components/ui/badge";
import { PackagesCell } from "./packages-cell";

type ServiceRow = NonNullable<
    Extract<Awaited<ReturnType<typeof GetServices>>, { success: true }>["data"]
>["data"][number];

export const columns: ColumnDef<ServiceRow>[] = [
    {
        id: "name",
        accessorKey: "name",
        header: "Service Name",
        cell: ({ row }) => (
            <span className="font-medium text-foreground">
                {row.original.name}
            </span>
        ),
    },
    {
        id: "packages",
        header: "Packages",
        cell: ({ row }) => {
            const packages = row.original.packages || [];
            const count = row.original._count?.packages ?? packages.length;

            return (
                <PackagesCell
                    serviceName={row.original.name}
                    packages={packages}
                    totalCount={count}
                />
            );
        },
    },
    {
        id: "isActive",
        accessorKey: "isActive",
        header: "Active Status",
        cell: ({ row }) => (
            <Badge variant={row.original.isActive ? "default" : "secondary"} className="text-xs">
                {row.original.isActive ? "Active" : "Inactive"}
            </Badge>
        ),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <ServiceActions service={row.original} />
        ),
    },
];