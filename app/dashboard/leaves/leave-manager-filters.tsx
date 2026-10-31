"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Department, LeaveType } from "@/app/generated/prisma/enums";
import { Button } from "@/components/ui/button";

export function LeaveManagerFilters({
  search,
  department,
  type,
  fromDate,
  throughDate,
  status,
  activeFilterCount,
}: {
  search?: string;
  department?: string;
  type?: string;
  fromDate?: string;
  throughDate?: string;
  status?: string;
  activeFilterCount: number;
}) {
  const hasFilter = Boolean(search || department || type || fromDate || throughDate);
  const [hasFilterState, setHasFilterState] = useState(hasFilter);

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const hasCurrentFilter = ["search", "department", "type", "fromDate", "throughDate"].some(
      (key) => String(formData.get(key) ?? "").trim().length > 0,
    );
    setHasFilterState(hasCurrentFilter);
  }

  return (
    <form
      method="get"
      action="/dashboard/leaves"
      onChange={handleChange}
      className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-6"
    >
      {status && <input type="hidden" name="status" value={status} />}
      <label className="relative min-w-0 sm:col-span-2 xl:col-span-2">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="search"
          defaultValue={search}
          placeholder="Search name or email"
          className="h-10 w-full min-w-0 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Search employee"
        />
      </label>
      <select name="department" defaultValue={department ?? ""} className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by department">
        <option value="">All departments</option>
        {Object.values(Department).map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <select name="type" defaultValue={type ?? ""} className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by leave type">
        <option value="">All leave types</option>
        {Object.values(LeaveType).map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <label className="min-w-0">
        <span className="sr-only">Requests overlapping from</span>
        <input name="fromDate" type="date" defaultValue={fromDate ?? ""} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground" aria-label="Requests overlapping from" />
      </label>
      <label className="min-w-0">
        <span className="sr-only">Requests overlapping through</span>
        <input name="throughDate" type="date" defaultValue={throughDate ?? ""} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground" aria-label="Requests overlapping through" />
      </label>
      <div className="flex gap-2 sm:col-span-2 xl:col-span-6">
        <Button type="submit" className="flex-1 sm:flex-none" disabled={!hasFilterState}>
          Apply filters
        </Button>
        {activeFilterCount > 0 && (
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <Link href="/dashboard/leaves">Clear filters</Link>
          </Button>
        )}
        {activeFilterCount > 0 && (
          <span className="hidden items-center text-xs text-muted-foreground sm:flex">
            {activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}
          </span>
        )}
      </div>
    </form>
  );
}
