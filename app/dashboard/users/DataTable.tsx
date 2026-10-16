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

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
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