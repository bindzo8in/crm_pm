import { GetCustomers } from "@/actions/customer";

type CustomerRow = Awaited<ReturnType<typeof GetCustomers>>["data"][number];

import { ColumnDef } from "@tanstack/react-table";
import { CustomerSchema } from "@/lib/schemas/customer-schema";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CustomerActions } from "./customer-actions";

export const columns: ColumnDef<CustomerRow>[] = [
    {
        accessorKey: "customerNumber",
        header: "Customer #",
        cell: ({ row }) => {
            const value = row.original.customerNumber;

            return value
                ? `CUS-${value.toString().padStart(5, "0")}`
                : "-";
        },
    },

    {
        accessorKey: "displayName",
        header: "Customer",
        cell: ({ row }) => (
            <div className="space-y-1">
                <p className="font-medium">
                    {row.original.displayName}
                </p>

                {row.original.companyName && (
                    <p className="text-muted-foreground text-xs">
                        {row.original.companyName}
                    </p>
                )}
            </div>
        ),
    },

    {
        accessorKey: "primaryContactName",
        header: "Contact",
        cell: ({ row }) => (
            <div className="space-y-1">
                <p>{row.original.primaryContactName ?? "-"}</p>

                {row.original.primaryContactEmail && (
                    <p className="text-muted-foreground text-xs">
                        {row.original.primaryContactEmail}
                    </p>
                )}
            </div>
        ),
    },

    {
        accessorKey: "primaryContactPhone",
        header: "Phone",
    },

    {
        accessorKey: "customerType",
        header: "Type",
        cell: ({ row }) => (
            <Badge variant="outline">
                {row.original.customerType}
            </Badge>
        ),
    },

    {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => {
            const date = row.getValue("createdAt");

            if (!date) return "-";

            return format(new Date(date as string), "dd MMM yyyy");
        },
    },

    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const customer = row.original;

            return (
                <CustomerActions
                    customer={customer}
                />
            );
        },
    },
];