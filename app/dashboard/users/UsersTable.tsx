"use client";

import { getUsers } from "@/actions/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { DataTable } from "./DataTable";
import { columns } from "./columns";

export default function UsersTable() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["users", pagination.pageIndex, pagination.pageSize, debouncedSearch],
    queryFn: () => getUsers({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      search: debouncedSearch,
    }),
  });

  return (
    <section className="min-w-0 space-y-4">
      <div className="relative w-full max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          placeholder="Search users by email"
          aria-label="Search users by email"
          className="pl-9"
        />
      </div>

      {isError ? (
        <Alert variant="destructive" className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <AlertTitle>Users could not be loaded</AlertTitle>
            <AlertDescription>Check your connection and try again.</AlertDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </Alert>
      ) : isLoading ? (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Loading users</span>
          <div className="h-10 animate-pulse rounded-md bg-muted" />
          <div className="space-y-2 rounded-lg border p-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-md bg-muted/70" />
            ))}
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.users ?? []}
          pagination={pagination}
          onPaginationChange={setPagination}
          total={data?.total ?? 0}
          emptyState={debouncedSearch ? "No users match this email." : "No users found."}
        />
      )}
    </section>
  );
}
