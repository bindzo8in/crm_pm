"use client";

import { getUsers } from "@/actions/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  CircleCheck,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { DataTable } from "./DataTable";
import { columns } from "./columns";
import { useSession } from "@/lib/auth-client";
import {
  Department,
  EmploymentStatus,
  UserRole,
  WorkMode,
} from "@/app/generated/prisma/enums";
import { canManageUserDirectory } from "@/lib/permissions";
import { CreateStaffDialog } from "./create-staff-dialog";

type UserFilters = {
  role: UserRole | "ALL";
  department: Department | "UNASSIGNED" | "ALL";
  employmentStatus: EmploymentStatus | "ALL";
  workMode: WorkMode | "ALL";
  attendanceReport: "ALL" | "INCLUDED" | "EXCLUDED";
  emailVerification: "ALL" | "VERIFIED" | "UNVERIFIED";
};

const initialFilters: UserFilters = {
  role: "ALL",
  department: "ALL",
  employmentStatus: "ALL",
  workMode: "ALL",
  attendanceReport: "ALL",
  emailVerification: "ALL",
};

function formatOption(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function UsersTable() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<UserFilters>(initialFilters);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 350);
  const { data: session } = useSession();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const activeFilterCount =
    Object.values(filters).filter((value) => value !== "ALL").length +
    (search.trim() ? 1 : 0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "users",
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
      filters,
    ],
    queryFn: () => getUsers({
      page: pagination.pageIndex,
      pageSize: pagination.pageSize,
      search: debouncedSearch,
      ...(filters.role !== "ALL" ? { role: filters.role } : {}),
      ...(filters.department !== "ALL" ? { department: filters.department } : {}),
      ...(filters.employmentStatus !== "ALL"
        ? { employmentStatus: filters.employmentStatus }
        : {}),
      ...(filters.workMode !== "ALL" ? { workMode: filters.workMode } : {}),
      ...(filters.attendanceReport !== "ALL"
        ? { includeInAttendanceReports: filters.attendanceReport === "INCLUDED" }
        : {}),
      ...(filters.emailVerification !== "ALL"
        ? { emailVerified: filters.emailVerification === "VERIFIED" }
        : {}),
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
      <div className="flex flex-col gap-4 rounded-2xl border bg-card px-4 py-5 shadow-sm sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">People directory</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Users & staff</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Manage access, teams, employment, work arrangements, and attendance report inclusion.
          </p>
        </div>
        {canCreateStaff && (
          <Button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="h-11 w-full gap-2 sm:w-auto"
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

      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              placeholder="Search by name or email"
              aria-label="Search users by name or email"
              className="h-11 bg-background pl-9"
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {data ? `${data.total} ${data.total === 1 ? "person" : "people"} found` : "Directory search"}
            </p>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 gap-1.5"
                onClick={() => {
                  setSearch("");
                  setFilters(initialFilters);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
              >
                <X className="size-4" />
                Clear filters
                <span className="sr-only">({activeFilterCount} active)</span>
              </Button>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-expanded={filtersExpanded}
          aria-controls="users-filter-controls"
          onClick={() => setFiltersExpanded((expanded) => !expanded)}
          className="flex min-h-10 w-full items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />
            <span>Filter people</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {activeFilterCount} active
              </span>
            )}
          </span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {filtersExpanded ? "Hide filters" : "Show filters"}
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform motion-reduce:transition-none ${filtersExpanded ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {filtersExpanded && (
        <div id="users-filter-controls" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="user-role-filter" className="text-xs font-medium text-muted-foreground">Role</label>
            <Select
              value={filters.role}
              onValueChange={(value) => {
                setFilters((current) => ({ ...current, role: value as UserFilters["role"] }));
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger id="user-role-filter" aria-label="Filter by role" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All roles</SelectItem>
                {Object.values(UserRole).map((role) => (
                  <SelectItem key={role} value={role}>{formatOption(role)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label htmlFor="user-department-filter" className="text-xs font-medium text-muted-foreground">Department</label>
            <Select
              value={filters.department}
              onValueChange={(value) => {
                setFilters((current) => ({ ...current, department: value as UserFilters["department"] }));
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger id="user-department-filter" aria-label="Filter by department" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All departments</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {Object.values(Department).map((department) => (
                  <SelectItem key={department} value={department}>{formatOption(department)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label htmlFor="user-employment-filter" className="text-xs font-medium text-muted-foreground">Employment</label>
            <Select
              value={filters.employmentStatus}
              onValueChange={(value) => {
                setFilters((current) => ({
                  ...current,
                  employmentStatus: value as UserFilters["employmentStatus"],
                }));
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger id="user-employment-filter" aria-label="Filter by employment status" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.values(EmploymentStatus).map((status) => (
                  <SelectItem key={status} value={status}>{formatOption(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label htmlFor="user-work-mode-filter" className="text-xs font-medium text-muted-foreground">Work mode</label>
            <Select
              value={filters.workMode}
              onValueChange={(value) => {
                setFilters((current) => ({ ...current, workMode: value as UserFilters["workMode"] }));
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger id="user-work-mode-filter" aria-label="Filter by work mode" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All work modes</SelectItem>
                {Object.values(WorkMode).map((mode) => (
                  <SelectItem key={mode} value={mode}>{formatOption(mode)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label htmlFor="user-attendance-filter" className="text-xs font-medium text-muted-foreground">Attendance report</label>
            <Select
              value={filters.attendanceReport}
              onValueChange={(value) => {
                setFilters((current) => ({
                  ...current,
                  attendanceReport: value as UserFilters["attendanceReport"],
                }));
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger id="user-attendance-filter" aria-label="Filter by attendance report inclusion" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All employees</SelectItem>
                <SelectItem value="INCLUDED">Included</SelectItem>
                <SelectItem value="EXCLUDED">Excluded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <label htmlFor="user-email-filter" className="text-xs font-medium text-muted-foreground">Email verification</label>
            <Select
              value={filters.emailVerification}
              onValueChange={(value) => {
                setFilters((current) => ({
                  ...current,
                  emailVerification: value as UserFilters["emailVerification"],
                }));
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
            >
              <SelectTrigger id="user-email-filter" aria-label="Filter by email verification" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All accounts</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="UNVERIFIED">Not verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
          )}
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
          emptyState={activeFilterCount > 0 ? "No users match these filters." : "No users found."}
        />
      )}
    </section>
  );
}
