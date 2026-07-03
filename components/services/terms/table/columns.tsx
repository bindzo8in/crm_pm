import { GetTerms } from "@/actions/terms";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { TermsActions } from "./actions";

type TermRow = NonNullable<
    Extract<Awaited<ReturnType<typeof GetTerms>>, { success: true }>["data"]
>["data"][number];

export const columns: ColumnDef<TermRow>[] = [
    {
        id: "title",
        accessorKey: "title",
        header: "Title",
        size: 250,
    },
    {
        id: "packages",
        accessorKey: "packages",
        header: "Packages",
        size: 300,
        cell: ({ row }) => {
            const packages = row.original.packages;

            if (!packages.length) {
                return (
                    <span className="text-muted-foreground">
                        All Packages
                    </span>
                );
            }

            return (
                <div className="flex flex-wrap gap-1">
                    {packages.slice(0, 3).map((pkg: any) => (
                        <Badge
                            key={pkg.packageId}
                            variant="secondary"
                        >
                            {pkg.packageName}
                        </Badge>
                    ))}

                    {packages.length > 3 && (
                        <Badge variant="outline">
                            +{packages.length - 3}
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