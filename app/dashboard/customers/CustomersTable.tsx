"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  CircleUserRound,
  Filter,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";

import { GetCustomers } from "@/actions/customer";
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { CustomerType } from "@/app/generated/prisma/enums";

type CustomerTypeFilter = CustomerType | "ALL";

export function CustomersTable() {
  const [search, setSearch] = useState("");
  const [customerType, setCustomerType] =
    useState<CustomerTypeFilter>("ALL");
  const [sortDirection, setSortDirection] =
    useState<"asc" | "desc">("desc");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const debouncedSearch = useDebounce(search, 400);
  const searchTerm = debouncedSearch.trim();

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: [
      "customers",
      pagination.pageIndex,
      pagination.pageSize,
      searchTerm,
      customerType,
      sortDirection,
    ],
    queryFn: () =>
      GetCustomers({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        customerType: customerType === "ALL" ? undefined : customerType,
        sortDirection,
      }),
  });

  const total = data?.pagination.total ?? 0;
  const hasFilters =
    Boolean(search.trim()) || customerType !== "ALL" || sortDirection !== "desc";
  const activeFilterCount =
    Number(customerType !== "ALL") + Number(sortDirection !== "desc");

  function clearFilters() {
    setSearch("");
    setCustomerType("ALL");
    setSortDirection("desc");
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  return (
    <section
      aria-labelledby="customer-directory-title"
      className="space-y-4 sm:space-y-5"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2
            id="customer-directory-title"
            className="text-lg font-semibold tracking-tight"
          >
            Customer directory
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                Updating results
              </span>
            ) : (
              `${total} ${total === 1 ? "customer" : "customers"}`
            )}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Find a customer by name, contact, email, phone, or customer number.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex items-center gap-2 md:hidden">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="customer-search-mobile"
              type="text"
              role="searchbox"
              aria-label="Search customers"
              placeholder="Search customers"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              className="h-11 pl-9 pr-10"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            aria-expanded={filtersExpanded}
            aria-controls="customer-additional-filters"
            onClick={() => setFiltersExpanded((expanded) => !expanded)}
            className="h-11 shrink-0 gap-2 px-3"
          >
            <Filter aria-hidden="true" className="size-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform motion-reduce:transition-none ${
                filtersExpanded ? "rotate-180" : ""
              }`}
            />
          </Button>
        </div>

        <div className="hidden gap-3 md:grid md:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto] md:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor="customer-search"
              className="text-sm font-medium"
            >
              Search customers
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="customer-search"
                type="text"
                role="searchbox"
                placeholder="Name, contact, CUS-00001..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                className="h-11 pl-9 pr-10"
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setPagination((current) => ({ ...current, pageIndex: 0 }));
                  }}
                  className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="customer-type-filter" className="text-sm font-medium">
              Customer type
            </label>
            <Select
              value={customerType}
              onValueChange={(value) => {
                if (value !== "ALL" && value !== CustomerType.BUSINESS && value !== CustomerType.INDIVIDUAL) {
                  return;
                }
                setCustomerType(value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger
                id="customer-type-filter"
                aria-label="Filter by customer type"
                className="h-11 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value={CustomerType.BUSINESS}>
                  <Building2 aria-hidden="true" />
                  Business
                </SelectItem>
                <SelectItem value={CustomerType.INDIVIDUAL}>
                  <CircleUserRound aria-hidden="true" />
                  Individual
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="customer-sort" className="text-sm font-medium">
              Sort by
            </label>
            <Select
              value={sortDirection}
              onValueChange={(value) => {
                if (value !== "asc" && value !== "desc") return;
                setSortDirection(value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger
                id="customer-sort"
                aria-label="Sort customers by date added"
                className="h-11 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="h-11 w-full md:w-auto"
            >
              <X aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>

        <div
          id="customer-additional-filters"
          className={`mt-3 gap-3 border-t pt-3 md:hidden ${
            filtersExpanded ? "grid" : "hidden"
          }`}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="customer-type-filter-mobile"
              className="text-sm font-medium"
            >
              Customer type
            </label>
            <Select
              value={customerType}
              onValueChange={(value) => {
                if (
                  value !== "ALL" &&
                  value !== CustomerType.BUSINESS &&
                  value !== CustomerType.INDIVIDUAL
                ) {
                  return;
                }
                setCustomerType(value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger
                id="customer-type-filter-mobile"
                aria-label="Filter by customer type"
                className="h-11 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value={CustomerType.BUSINESS}>
                  <Building2 aria-hidden="true" />
                  Business
                </SelectItem>
                <SelectItem value={CustomerType.INDIVIDUAL}>
                  <CircleUserRound aria-hidden="true" />
                  Individual
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="customer-sort-mobile" className="text-sm font-medium">
              Sort by
            </label>
            <Select
              value={sortDirection}
              onValueChange={(value) => {
                if (value !== "asc" && value !== "desc") return;
                setSortDirection(value);
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger
                id="customer-sort-mobile"
                aria-label="Sort customers by date added"
                className="h-11 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="h-11 w-full"
            >
              <X aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>

        {hasFilters && (
          <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
            Results update as you change filters.
          </p>
        )}
      </div>

      {isError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-destructive">
            Customers could not be loaded. Check your connection and try again.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            className="min-h-11 shrink-0"
          >
            Try again
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        total={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage={
          hasFilters
            ? "No customers match these filters. Clear filters to see all customers."
            : "No customers yet. Use Create Customer to add your first customer."
        }
      />
    </section>
  );
}
