"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  PlatformUserDirectoryUser,
  PlatformUserSortBy,
  PlatformUserSortDirection,
} from "@/lib/platform-user-directory-types";

type PlatformUserTableProps = {
  users: PlatformUserDirectoryUser[];
  sortBy: PlatformUserSortBy;
  sortDirection: PlatformUserSortDirection;
  sortLinks: Record<PlatformUserSortBy, string>;
};

function SortHeader({
  label,
  field,
  sortBy,
  sortDirection,
  href,
}: {
  label: string;
  field: PlatformUserSortBy;
  sortBy: PlatformUserSortBy;
  sortDirection: PlatformUserSortDirection;
  href: string;
}) {
  const active = sortBy === field;
  const Icon = active
    ? sortDirection === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <Link href={href} className="inline-flex items-center gap-1">
      {label}
      <Icon aria-hidden="true" className="size-3" />
    </Link>
  );
}

function formatRole(role: string) {
  return role
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function PlatformUserTable({
  users,
  sortBy,
  sortDirection,
  sortLinks,
}: PlatformUserTableProps) {
  const columns: ColumnDef<PlatformUserDirectoryUser>[] = [
    {
      accessorKey: "name",
      header: () => (
        <SortHeader
          label="Name"
          field="name"
          sortBy={sortBy}
          sortDirection={sortDirection}
          href={sortLinks.name}
        />
      ),
      cell: ({ row }) => (
        <p className="min-w-40 font-medium">{row.original.name}</p>
      ),
    },
    {
      accessorKey: "email",
      header: () => (
        <SortHeader
          label="Email"
          field="email"
          sortBy={sortBy}
          sortDirection={sortDirection}
          href={sortLinks.email}
        />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-52 flex-col gap-1">
          <span>{row.original.email}</span>
          <Badge
            variant={row.original.emailVerified ? "secondary" : "outline"}
            className="w-fit"
          >
            {row.original.emailVerified ? "Verified" : "Unverified"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "globalRole",
      header: "Platform role",
      cell: ({ row }) => formatRole(row.original.globalRole),
    },
    {
      accessorKey: "organizations",
      header: "Organization memberships",
      cell: ({ row }) =>
        row.original.organizations.length > 0 ? (
          <div className="flex min-w-52 flex-wrap gap-1">
            {row.original.organizations.map((organization) => (
              <Badge
                key={organization.id}
                variant="outline"
                title={organization.slug}
              >
                {organization.name} · {formatRole(organization.role)}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">No organization memberships</span>
        ),
    },
    {
      accessorKey: "createdAt",
      header: () => (
        <SortHeader
          label="Created"
          field="createdAt"
          sortBy={sortBy}
          sortDirection={sortDirection}
          href={sortLinks.createdAt}
        />
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No platform users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
