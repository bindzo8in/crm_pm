import { GetTerms } from "@/actions/terms";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { TermsActions } from "./actions";

type TermRow = NonNullable<
    Awaited<ReturnType<typeof GetTerms>>["data"]
>["data"][number];

export const columns: ColumnDef<TermRow>[] = [
    {
        id: "title",
        accessorKey: "title",
        header: "Title",
        size: 250,
    },
    {
        id: "services",
        accessorKey: "services",
        header: "Services",
        size: 300,
        cell: ({ row }) => {
            const services = row.original.services;

            if (!services.length) {
                return (
                    <span className="text-muted-foreground">
                        All Services
                    </span>
                );
            }

            return (
                <div className="flex flex-wrap gap-1">
                    {services.slice(0, 3).map((service) => (
                        <Badge
                            key={service.serviceId}
                            variant="secondary"
                        >
                            {service.serviceName}
                        </Badge>
                    ))}

                    {services.length > 3 && (
                        <Badge variant="outline">
                            +{services.length - 3}
                        </Badge>
                    )}
                </div>
            );
        },
    },
    {
        id: "isDefault",
        accessorKey: "isDefault",
        header: "Default",
        cell: ({ row }) =>
            row.original.isDefault ? (
                <Badge>Default</Badge>
            ) : (
                <Badge
                    variant="secondary"
                    className="text-muted-foreground"
                >
                    Not Default
                </Badge>
            ),
    },
    {
        id: "isActive",
        accessorKey: "isActive",
        header: "Status",
    },
    {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "Last Updated",
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <TermsActions term={row.original} />
        ),
    },
];