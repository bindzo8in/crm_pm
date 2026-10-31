"use client";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { Dispatch, SetStateAction } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    total: number;
    pagination: {
        pageIndex: number;
        pageSize: number;
    };
    onPaginationChange: Dispatch<
        SetStateAction<{
            pageIndex: number;
            pageSize: number;
        }>
    >;
    emptyState?: string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    total,
    pagination,
    onPaginationChange,
    emptyState = "No results found.",
}: DataTableProps<TData, TValue>) {
    const pageCount = Math.max(
        1,
        Math.ceil(total / pagination.pageSize)
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),

        manualPagination: true,
        pageCount,

        state: {
            pagination,
        },

        onPaginationChange,
    });

    const start =
        total === 0
            ? 0
            : pagination.pageIndex * pagination.pageSize + 1;

    const end = Math.min(
        (pagination.pageIndex + 1) * pagination.pageSize,
        total
    );
    const tableHeaders = table.getHeaderGroups().flatMap((headerGroup) => headerGroup.headers);

    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="grid gap-3 bg-muted/20 p-3 lg:hidden sm:grid-cols-2 sm:p-4">
                {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => {
                        const cells = row.getVisibleCells();
                        const nameCell = cells.find((cell) => cell.column.id === "name");
                        const emailCell = cells.find((cell) => cell.column.id === "email");
                        const actionCell = cells.find((cell) => cell.column.id === "actions");
                        const detailCells = cells.filter(
                            (cell) => !["name", "email", "actions"].includes(cell.column.id),
                        );

                        return (
                            <article
                                key={row.id}
                                className="space-y-3 rounded-xl border bg-card px-3.5 py-4 shadow-sm sm:px-4"
                            >
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        {nameCell && (
                                            <h3 className="truncate text-sm font-semibold">
                                                {flexRender(nameCell.column.columnDef.cell, nameCell.getContext())}
                                            </h3>
                                        )}
                                        {emailCell && (
                                            <p className="mt-1 break-all text-xs text-muted-foreground">
                                                {flexRender(emailCell.column.columnDef.cell, emailCell.getContext())}
                                            </p>
                                        )}
                                    </div>
                                    {actionCell && (
                                        <div className="-mr-2 -mt-2 shrink-0">
                                            {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
                                        </div>
                                    )}
                                </div>
                                {detailCells.length > 0 && (
                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-md bg-muted/40 p-3 sm:grid-cols-3">
                                        {detailCells.map((cell) => {
                                            const header = tableHeaders.find(
                                                (tableHeader) => tableHeader.column.id === cell.column.id,
                                            );
                                            const label = header && !header.isPlaceholder
                                                ? flexRender(header.column.columnDef.header, header.getContext())
                                                : cell.column.id;

                                            return (
                                                <div key={cell.id} className="min-w-0 space-y-1">
                                                    <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                        {label}
                                                    </dt>
                                                    <dd className="min-w-0 truncate text-xs font-medium">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </dd>
                                                </div>
                                            );
                                        })}
                                    </dl>
                                )}
                            </article>
                        );
                    })
                ) : (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {emptyState}
                    </p>
                )}
            </div>

            <div className="hidden lg:block">
                <Table className="[&_td]:border-border/60 [&_th]:border-border [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-muted/35">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody>
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={
                                        row.getIsSelected() && "selected"
                                    }
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
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
                                    {emptyState}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-3 border-t p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="text-sm text-muted-foreground">
                    Showing {start} - {end} of {total}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            Rows per page
                        </span>

                        <Select
                            value={String(pagination.pageSize)}
                            onValueChange={(value) =>
                                onPaginationChange((prev) => ({
                                    ...prev,
                                    pageIndex: 0,
                                    pageSize: Number(value),
                                }))
                            }
                        >
                            <SelectTrigger aria-label="Rows per page" className="h-9 w-[80px]">
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="text-sm font-medium whitespace-nowrap">
                        Page {pagination.pageIndex + 1} of {pageCount}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-10"
                            aria-label="Previous page"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            className="size-10"
                            aria-label="Next page"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}