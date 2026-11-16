"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  LoaderCircle,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

import { getUsers } from "@/actions/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "./DataTable";
import { createUserColumns } from "./columns";

type UserFilters = {
  role: string;
  teamId: string;
  verification: "ALL" | "VERIFIED" | "UNVERIFIED";
};

const initialFilters: UserFilters = {
  role: "ALL",
  teamId: "ALL",
  verification: "ALL",
};

function formatRole(role: string) {
  return role.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UsersTable({
  canManageOrganization,
}: {
  canManageOrganization: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const debouncedSearch = useDebounce(search, 400);
  const searchTerm = debouncedSearch.trim();
  const columns = useMemo(
    () => createUserColumns(canManageOrganization),
    [canManageOrganization],
  );

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: [
      "organization-users",
      pagination.pageIndex,
      pagination.pageSize,
      searchTerm,
      filters.role,
      filters.teamId,
      filters.verification,
    ],
    queryFn: () =>
      getUsers({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        role: filters.role === "ALL" ? undefined : filters.role,
        teamId: filters.teamId === "ALL" ? undefined : filters.teamId,
        emailVerified:
          filters.verification === "ALL"
            ? undefined
            : filters.verification === "VERIFIED",
      }),
  });

  const total = data?.total ?? 0;
  const hasFilters =
    Boolean(search.trim()) ||
    filters.role !== "ALL" ||
    filters.teamId !== "ALL" ||
    filters.verification !== "ALL";
  const activeFilterCount =
    Number(filters.role !== "ALL") +
    Number(filters.teamId !== "ALL") +
    Number(filters.verification !== "ALL");

  function updateFilter<Key extends keyof UserFilters>(
    key: Key,
    value: UserFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  function clearFilters() {
    setSearch("");
    setFilters(initialFilters);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  return (
    <section className="flex flex-col gap-5" aria-labelledby="organization-members-title">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2
            id="organization-members-title"
            className="text-xl font-semibold tracking-tight"
          >
            Organization members
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Find people in this organization and see the access they have.
          </p>
        </div>
        {canManageOrganization && (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/organization-management#members">
              <UsersRound data-icon="inline-start" />
              Manage members &amp; access
            </Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Access overview</CardTitle>
          <CardDescription>
            Member and email counts follow your filters; roles and teams show organization totals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <UsersRound className="text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-lg font-semibold tabular-nums">{total}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BadgeCheck className="text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  {data?.stats.verified ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Verified emails</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  {data?.stats.customRoles ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Custom roles</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  {data?.stats.teams ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Teams</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card p-3 sm:p-4">
        <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(9rem,12rem))_auto] lg:items-end">
          <Field>
            <FieldLabel htmlFor="organization-user-search">Search members</FieldLabel>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="organization-user-search"
                type="search"
                role="searchbox"
                placeholder="Name or email"
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
                  className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-muted-foreground"
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="organization-user-role">Role</FieldLabel>
            <Select
              value={filters.role}
              onValueChange={(value) => updateFilter("role", value)}
            >
              <SelectTrigger id="organization-user-role" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">All roles</SelectItem>
                  {(data?.roles ?? []).map((role) => (
                    <SelectItem key={role} value={role}>
                      {formatRole(role)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="organization-user-team">Team</FieldLabel>
            <Select
              value={filters.teamId}
              onValueChange={(value) => updateFilter("teamId", value)}
            >
              <SelectTrigger id="organization-user-team" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">All teams</SelectItem>
                  {(data?.teams ?? []).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="organization-user-verification">Email status</FieldLabel>
            <Select
              value={filters.verification}
              onValueChange={(value) => {
                const verification =
                  value === "VERIFIED" || value === "UNVERIFIED"
                    ? value
                    : "ALL";
                updateFilter("verification", verification);
              }}
            >
              <SelectTrigger
                id="organization-user-verification"
                className="h-11 w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="UNVERIFIED">Unverified</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <div className="flex items-end">
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                className="h-11 w-full lg:w-auto"
              >
                Clear filters
              </Button>
            )}
          </div>
        </FieldGroup>

        <div className="mt-4 flex min-h-6 items-center justify-between border-t pt-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-1.5">
                <LoaderCircle
                  aria-hidden="true"
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                />
                Updating members
              </span>
            ) : (
              `${total} ${total === 1 ? "member" : "members"}`
            )}
          </p>
          {activeFilterCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} applied
            </span>
          )}
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Members could not be loaded</AlertTitle>
          <AlertDescription>
            Refresh the page or try again in a moment.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="flex flex-col gap-3" aria-label="Loading members">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.users ?? []}
          total={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          emptyState={
            hasFilters
              ? "No members match these filters."
              : "No organization members yet."
          }
        />
      )}
    </section>
  );
}
