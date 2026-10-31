"use client";

import { getUsers } from "@/actions/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CircleCheck,
  Search,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { useSession } from "@/lib/auth-client";
import { UserRole } from "@/app/generated/prisma/enums";
import { canManageUserDirectory } from "@/lib/permissions";
import { CreateStaffDialog } from "./create-staff-dialog";

export default function UsersTable() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 350);
  const { data: session } = useSession();
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
  const canCreateStaff =
    session?.user.role &&
    canManageUserDirectory(
      session.user.role as UserRole,
      session.user.department,
    );
  const stats = [
    {
      label: "Total people",
      value: data?.total ?? 0,
      detail: "In this directory",
      icon: UsersRound,
      iconClass: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
    },
    {
      label: "Active staff",
      value: data?.stats.active ?? 0,
      detail: "Currently employed",
      icon: CircleCheck,
      iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      label: "Departments",
      value: data?.stats.departments.length ?? 0,
      detail: data?.stats.departments.length === 1 ? "Team represented" : "Teams represented",
      icon: Building2,
      iconClass: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
    },
    {
      label: "Email verified",
      value: data?.stats.verified ?? 0,
      detail: "Accounts confirmed",
      icon: ShieldCheck,
      iconClass: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
    },
  ];

  return (
    <section className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 px-4 py-5 shadow-sm sm:px-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">People directory</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Users & staff</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Manage access, teams, employment, and work arrangements from one place.
          </p>
        </div>
        {canCreateStaff && (
          <Button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="h-10 w-full gap-2 sm:w-auto"
          >
            <UserRoundPlus className="size-4" />
            Create staff
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-xl border bg-card p-3.5 shadow-sm sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${stat.iconClass}`}>
                <stat.icon className="size-4" />
              </div>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
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
            className="h-11 bg-background pl-9"
          />
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          {data ? `${data.total} ${data.total === 1 ? "person" : "people"} found` : "Directory search"}
        </p>
      </div>

      <CreateStaffDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

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
