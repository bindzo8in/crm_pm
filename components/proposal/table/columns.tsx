import { getProposals } from "@/actions/proposal";
import { ColumnDef } from "@tanstack/react-table";
import { ProposalActions } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";

type GetProposalsResponse = Awaited<ReturnType<typeof getProposals>>;

type ProposalRow =
  NonNullable<
    Extract<GetProposalsResponse, { success: true }>["data"]
  >["data"][number];

export function getProposalColumns(canConvertToProject: boolean): ColumnDef<ProposalRow>[] {
  return [
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
    cell: ({ row }) => {
      const proposal = row.original;
      const customerName = proposal.customerCompanyName
        ? `${proposal.customerDisplayName} (${proposal.customerCompanyName})`
        : proposal.customerDisplayName;

      return (
        <div className="min-w-0 space-y-1 whitespace-normal">
          <div className="break-words font-medium text-foreground">{customerName}</div>
          {proposal.customerEmail && (
            <a
              href={`mailto:${proposal.customerEmail}`}
              className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              <Mail aria-hidden="true" className="size-3 shrink-0" />
              <span className="break-all">{proposal.customerEmail}</span>
            </a>
          )}
          {proposal.customerPhone && (
            <a
              href={`tel:${proposal.customerPhone}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              <Phone aria-hidden="true" className="size-3 shrink-0" />
              <span>{proposal.customerPhone}</span>
            </a>
          )}
        </div>
      );
    },
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
        {row.original.grandTotal.toLocaleString("en-IN", {
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
      <ProposalActions proposal={row.original} canConvertToProject={canConvertToProject} />
    ),
  },
  ];
}