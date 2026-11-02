"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";

import { getProposals } from "@/actions/proposal";
import { getProposalColumns } from "./columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/data-table";

import { ProposalQuerySchema } from "@/lib/schemas/proposal-schema";
import { proposalKeys } from "../util";

const PROPOSAL_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
type ProposalStatus = typeof PROPOSAL_STATUSES[number];

function isProposalStatus(value: string): value is ProposalStatus {
    return PROPOSAL_STATUSES.some((status) => status === value);
}

export function ProposalTable({
    initialQuery,
    canConvertToProject,
}: {
    initialQuery: ProposalQuerySchema;
    canConvertToProject: boolean;
}) {
    const [search, setSearch] = useState(initialQuery.search ?? "");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [status, setStatus] = useState<ProposalStatus | "">(initialQuery.status ?? "");
    const [customerId, setCustomerId] = useState(initialQuery.customerId ?? "");
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
    const [validUntilFrom, setValidUntilFrom] = useState(initialQuery.validUntilFrom ?? "");
    const [validUntilTo, setValidUntilTo] = useState(initialQuery.validUntilTo ?? "");
    const [pagination, setPagination] = useState({
        pageIndex: initialQuery.page,
        pageSize: initialQuery.pageSize,
    });
    const debouncedSearch = useDebounce(search, 500);

    const normalizedSearch = debouncedSearch.trim() || undefined;
    const dateRangeInvalid = Boolean(
        validUntilFrom && validUntilTo && validUntilFrom > validUntilTo,
    );

    const query: ProposalQuerySchema = {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: normalizedSearch,
        status: status || undefined,
        customerId: customerId || undefined,
        validUntilFrom: dateRangeInvalid ? undefined : validUntilFrom || undefined,
        validUntilTo: dateRangeInvalid ? undefined : validUntilTo || undefined,
        sortDirection: initialQuery.sortDirection,
    };

    const { data } = useQuery({
        queryKey: proposalKeys.list(query),
        queryFn: () => getProposals(query),
    });
    const columns = getProposalColumns(canConvertToProject);
    const matchingProposal = data?.success
        ? data.data?.data.find((proposal) => proposal.customerId === customerId)
        : undefined;
    const fallbackCustomer: CustomerOption | null = matchingProposal
        ? {
            id: matchingProposal.customerId,
            customerNumber: 0,
            displayName: matchingProposal.customerDisplayName,
            companyName: matchingProposal.customerCompanyName,
            primaryContactName: null,
        }
        : null;
    const activeFilterCount = [
        status,
        customerId,
        validUntilFrom || validUntilTo,
    ].filter(Boolean).length;

    const resetPage = () => {
        setPagination((current) => ({ ...current, pageIndex: 0 }));
    };

    const clearFilters = () => {
        setStatus("");
        setCustomerId("");
        setSelectedCustomer(null);
        setValidUntilFrom("");
        setValidUntilTo("");
        setSearch("");
        resetPage();
    };

    return (
        <div className="space-y-4">
            <div className="flex min-w-0 items-center gap-2 sm:justify-between sm:gap-4">
                <Input
                    placeholder="Search proposals..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        resetPage();
                    }}
                    className="min-w-0 flex-1 sm:max-w-sm"
                />
                <Button
                    type="button"
                    variant="outline"
                    aria-expanded={filtersOpen}
                    aria-controls="proposal-filters"
                    onClick={() => setFiltersOpen((open) => !open)}
                    className="w-auto shrink-0 gap-2 px-3"
                >
                    <span className="flex items-center gap-2">
                        <Filter aria-hidden="true" className="size-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                                {activeFilterCount}
                            </span>
                        )}
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        className={`hidden size-4 transition-transform sm:block ${filtersOpen ? "rotate-180" : ""}`}
                    />
                </Button>
            </div>

            <div id="proposal-filters" hidden={!filtersOpen}>
                {filtersOpen && (
                    <section
                        aria-label="Filter proposals"
                        className="rounded-lg border bg-card p-3 sm:p-5"
                    >
                        <div
                            className={`flex items-center justify-between gap-2 sm:mb-4 ${
                                activeFilterCount > 0 ? "mb-3" : "mb-0"
                            }`}
                        >
                            <div className="hidden sm:block">
                                <h2 className="text-sm font-semibold">Filter proposals</h2>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Narrow results by status, customer, or validity date.
                                </p>
                            </div>
                            {activeFilterCount > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="ml-auto h-8 gap-2 px-2"
                                >
                                    <RotateCcw aria-hidden="true" className="size-3.5" />
                                    Clear filters
                                </Button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:gap-4 xl:grid-cols-4">
                            <div className="min-w-0 space-y-2">
                                <label htmlFor="proposal-status-filter" className="text-sm font-medium">
                                    Status
                                </label>
                                <Select
                                    value={status || "ALL"}
                                    onValueChange={(value) => {
                                        if (value === "ALL") {
                                            setStatus("");
                                        } else if (isProposalStatus(value)) {
                                            setStatus(value);
                                        }
                                        resetPage();
                                    }}
                                >
                                    <SelectTrigger id="proposal-status-filter" className="w-full">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All statuses</SelectItem>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="SENT">Sent</SelectItem>
                                        <SelectItem value="ACCEPTED">Accepted</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                        <SelectItem value="EXPIRED">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="min-w-0 space-y-2">
                                <label className="text-sm font-medium">Customer</label>
                                <CustomerCombobox
                                    value={customerId || undefined}
                                    selectedCustomer={selectedCustomer ?? fallbackCustomer}
                                    onValueChange={(customer) => {
                                        setSelectedCustomer(customer);
                                        setCustomerId(customer.id);
                                        resetPage();
                                    }}
                                />
                                {customerId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerId("");
                                            setSelectedCustomer(null);
                                            resetPage();
                                        }}
                                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                    >
                                        Remove customer filter
                                    </button>
                                )}
                            </div>

                            <div className="min-w-0 space-y-2">
                                <label htmlFor="proposal-valid-from" className="text-sm font-medium">
                                    Valid from
                                </label>
                                <Input
                                    id="proposal-valid-from"
                                    type="date"
                                    value={validUntilFrom}
                                    max={validUntilTo || undefined}
                                    onChange={(event) => {
                                        setValidUntilFrom(event.target.value);
                                        resetPage();
                                    }}
                                />
                            </div>

                            <div className="min-w-0 space-y-2">
                                <label htmlFor="proposal-valid-to" className="text-sm font-medium">
                                    Valid to
                                </label>
                                <Input
                                    id="proposal-valid-to"
                                    type="date"
                                    value={validUntilTo}
                                    min={validUntilFrom || undefined}
                                    onChange={(event) => {
                                        setValidUntilTo(event.target.value);
                                        resetPage();
                                    }}
                                />
                            </div>
                        </div>
                        {dateRangeInvalid && (
                            <p role="alert" className="mt-3 text-sm text-destructive">
                                The start date must be on or before the end date.
                            </p>
                        )}
                    </section>
                )}
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
