import { GetServices } from "@/actions/services";
import { ColumnDef } from "@tanstack/react-table";
import { ServiceActions } from "./actions";

type ServiceRow = NonNullable<
    Extract<Awaited<ReturnType<typeof GetServices>>, { success: true }>["data"]
>["data"][number];

export const columns: ColumnDef<ServiceRow>[] = [
    {
        id: "name",
        accessorKey: "name",
        header: "Service Name",
    },
    {
        id: "description",
        accessorKey: "description",
        header: "Description",
        size: 350,
        cell: ({ row }) => (
            <div className="max-w-[350px] text-start overflow-hidden">
                <p
                    className="text-wrap text-muted-foreground"
                    title={row.original.description ?? undefined}
                >
                    {row.original.description ?? "—"}
                </p>
            </div>
        ),
    },
    {
        id: "isActive",
        accessorKey: "isActive",
        header: "Active Status",
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <ServiceActions service={row.original} />
        ),
    },
];