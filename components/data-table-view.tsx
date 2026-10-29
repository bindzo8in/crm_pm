"use client";

import {
    flexRender,
    type RowData,
    type Table as ReactTable,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function DataTableView<TData extends RowData>({
    table,
    emptyMessage,
    mobileTitleColumnId,
}: {
    table: ReactTable<TData>;
    emptyMessage: string;
    mobileTitleColumnId?: string;
}) {
    const headerGroups = table.getHeaderGroups();
    const headers = headerGroups.flatMap((group) => group.headers);
    const rows = table.getRowModel().rows;

    return (
        <>
            <div className="divide-y lg:hidden">
                {rows.length ? rows.map((row) => {
                    const cells = row.getVisibleCells();
                    const titleCell = cells.find((cell) => cell.column.id === mobileTitleColumnId)
                        ?? cells.find((cell) => cell.column.id !== "actions");
                    const actionCell = cells.find((cell) => cell.column.id === "actions");
                    const detailCells = cells.filter(
                        (cell) => cell !== titleCell && cell.column.id !== "actions",
                    );

                    return (
                        <article key={row.id} className="space-y-3 bg-card px-3 py-3.5 sm:px-4">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                    {titleCell && (
                                        <div role="heading" aria-level={3} className="break-words text-sm font-semibold">
                                            {flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}
                                        </div>
                                    )}
                                    {detailCells[0] && (
                                        <div className="mt-1 break-words text-xs text-muted-foreground">
                                            {flexRender(detailCells[0].column.columnDef.cell, detailCells[0].getContext())}
                                        </div>
                                    )}
                                </div>
                                {actionCell && (
                                    <div className="-mr-2 -mt-2 shrink-0">
                                        {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
                                    </div>
                                )}
                            </div>
                            {detailCells.length > 1 && (
                                <dl className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-md bg-muted/40 p-3 sm:grid-cols-3">
                                    {detailCells.slice(1).map((cell) => {
                                        const header = headers.find(
                                            (item) => item.column.id === cell.column.id,
                                        );
                                        const label = header && !header.isPlaceholder
                                            ? flexRender(header.column.columnDef.header, header.getContext())
                                            : cell.column.id;

                                        return (
                                            <div key={cell.id} className="min-w-0 space-y-1">
                                                <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    {label}
                                                </dt>
                                                <dd className="min-w-0 break-words text-xs font-medium">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            )}
                        </article>
                    );
                }) : (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
                )}
            </div>

            <div className="hidden lg:block">
                <Table>
                    <TableHeader>
                        {headerGroups.map((headerGroup) => (
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
                        {rows.length ? rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center text-muted-foreground">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
