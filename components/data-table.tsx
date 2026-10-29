"use client";

import { Button } from "@/components/ui/button";
import {
    type ColumnDef,
    type RowData,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DataTableView } from "@/components/data-table-view";

interface DataTableProps<TData extends RowData, TValue> {
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
    emptyMessage?: string;
    mobileTitleColumnId?: string;
}

export function DataTable<TData extends RowData, TValue>({
    columns,
    data,
    total,
    pagination,
    onPaginationChange,
    emptyMessage = "No results found.",
    mobileTitleColumnId,
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
            <DataTableView
                table={table}
                emptyMessage={emptyMessage}
                mobileTitleColumnId={mobileTitleColumnId}
            />

            <div className="flex flex-col gap-4 border-t p-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {start} - {end} of {total}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 md:gap-6">
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
                            <SelectTrigger aria-label="Rows per page" className="h-8 w-[80px]">
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
                            className="h-9 w-9"
                            aria-label="Previous page"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
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