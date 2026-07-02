"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getProposals } from "@/actions/proposal";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/data-table";

import { ProposalQuerySchema } from "@/lib/schemas/proposal-schema";
import { proposalKeys } from "../util";

export function ProposalTable({ initialQuery }: { initialQuery: ProposalQuerySchema }) {
    const [search, setSearch] = useState(initialQuery.search ?? "");
    const [pagination, setPagination] = useState({
        pageIndex: initialQuery.page,
        pageSize: initialQuery.pageSize,
    });
    const debouncedSearch = useDebounce(search, 500);

    const normalizedSearch = debouncedSearch.trim() || undefined;

    const query: ProposalQuerySchema = {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: normalizedSearch,
        status: initialQuery.status,
        sortDirection: initialQuery.sortDirection,
    };

    const { data } = useQuery({
        queryKey: proposalKeys.list(query),
        queryFn: () => getProposals(query),
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center gap-4">
                <Input
                    placeholder="Search proposals..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPagination((prev) => ({
                            ...prev,
                            pageIndex: 0,
                        }));
                    }}
                    className="max-w-xs"
                />
            </div>
            <DataTable
                columns={columns}
                data={(data?.success ? data.data?.data : undefined) ?? []}
                total={(data?.success ? data.data?.pagination.total : undefined) ?? 0}
                pagination={pagination}
                onPaginationChange={setPagination}
            />
        </div>
    );
}
