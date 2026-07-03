import { getProposals } from "@/actions/proposal";
import { ColumnDef } from "@tanstack/react-table";
import { ProposalActions } from "./actions";
import { Badge } from "@/components/ui/badge";

type GetProposalsResponse = Awaited<ReturnType<typeof getProposals>>;

type ProposalRow =
  NonNullable<
    Extract<GetProposalsResponse, { success: true }>["data"]
  >["data"][number];

export const columns: ColumnDef<ProposalRow>[] = [
  {
    accessorKey: "proposalNumber",
    header: "Proposal #",
    cell: ({ row }) => `QUOT-${row.original.proposalNumber}`,
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    id: "customer",
    accessorFn: (row) =>
      row.customerCompanyName
        ? `${row.customerDisplayName} (${row.customerCompanyName})`
        : row.customerDisplayName,
    header: "Customer",
  },
  {
    accessorKey: "validUntil",
    header: "Valid Until",
    cell: ({ row }) =>
      row.original.validUntil
        ? new Date(row.original.validUntil).toLocaleDateString("en-IN")
        : "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;

      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "grandTotal",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {row.original.grandTotal.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    ),
  },
  {
    accessorKey: "preparedByName",
    header: "Prepared By",
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <ProposalActions proposal={row.original} />
    ),
  },
];