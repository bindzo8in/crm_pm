import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Department, LeaveStatus, LeaveType, UserRole } from "@/app/generated/prisma/enums";
import {
  getAllLeaveRequestsAction,
  getAnnualLeaveBalanceAction,
  getMyLeaveRequestsAction,
} from "@/actions/leave";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInIST } from "@/lib/date";
import { isLeaveManager, requireLeaveUser } from "@/lib/leave-access";
import type { LeaveRequestRow, ManagerLeaveRequestRow } from "@/lib/types/leave";
import { CancelLeaveButton } from "./cancel-leave-button";
import { LeaveRequestForm } from "./leave-request-form";
import { LeaveReviewDialog } from "./leave-review-dialog";
import DashboardContainer from "../dashboard-container";

type SearchParameters = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsedPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 0 ? Math.min(page, 100_000) : 0;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function statusVariant(status: LeaveStatus): "default" | "destructive" | "secondary" {
  if (status === LeaveStatus.APPROVED) return "default";
  if (status === LeaveStatus.REJECTED) return "destructive";
  return "secondary";
}

function buildPageHref(query: URLSearchParams, pageKey: string, page: number): string {
  const next = new URLSearchParams(query);
  next.set(pageKey, String(page));
  const search = next.toString();
  return search ? `/dashboard/leaves?${search}` : "/dashboard/leaves";
}

function LeaveDays({
  totalDays,
  netLeaveDays,
  sundayCount,
  holidayCount,
}: {
  totalDays: number;
  netLeaveDays: number;
  sundayCount: number;
  holidayCount: number;
}) {
  return (
    <div className="min-w-36 space-y-1 text-xs">
      <p><span className="font-medium">{netLeaveDays}</span> chargeable</p>
      <p className="text-muted-foreground">
        {sundayCount} Sundays · {holidayCount} holidays
      </p>
      <p className="text-muted-foreground">{totalDays} calendar days</p>
    </div>
  );
}

function LeaveTableRow({
  leave,
  managerUser,
  viewerId,
}: {
  leave: LeaveRequestRow;
  managerUser?: ManagerLeaveRequestRow["user"];
  viewerId: string;
}) {
  const canReview = Boolean(
    managerUser &&
    leave.status === LeaveStatus.PENDING &&
    managerUser.id !== viewerId,
  );

  return (
    <TableRow>
      {managerUser && (
        <TableCell className="min-w-40">
          <p className="font-medium">{managerUser.name || managerUser.email}</p>
          <p className="text-xs text-muted-foreground">{managerUser.department ?? "No department"}</p>
        </TableCell>
      )}
      <TableCell><Badge variant="outline">{leave.type}</Badge></TableCell>
      <TableCell className="min-w-36">
        {formatDate(leave.startDate)}<br />
        <span className="text-muted-foreground">to {formatDate(leave.endDate)}</span>
      </TableCell>
      <TableCell>
        <LeaveDays
          totalDays={leave.totalDays}
          netLeaveDays={leave.netLeaveDays}
          sundayCount={leave.sundayCount}
          holidayCount={leave.holidayCount}
        />
      </TableCell>
      <TableCell className="max-w-56 whitespace-normal">{leave.reason}</TableCell>
      <TableCell><Badge variant={statusVariant(leave.status)}>{leave.status}</Badge></TableCell>
      <TableCell className="max-w-48 whitespace-normal">{leave.managerComment || "—"}</TableCell>
      <TableCell className="text-right">
        {canReview && managerUser
          ? <LeaveReviewDialog leave={{ ...leave, user: managerUser }} />
          : managerUser && leave.status === LeaveStatus.PENDING
            ? <span className="text-xs text-muted-foreground">Self-review blocked</span>
            : !managerUser && leave.status === LeaveStatus.PENDING
              ? <CancelLeaveButton id={leave.id} />
              : "—"}
      </TableCell>
    </TableRow>
  );
}

function LeaveRequestCard({
  leave,
  managerUser,
  viewerId,
}: {
  leave: LeaveRequestRow;
  managerUser?: ManagerLeaveRequestRow["user"];
  viewerId: string;
}) {
  const canReview = Boolean(
    managerUser &&
    leave.status === LeaveStatus.PENDING &&
    managerUser.id !== viewerId,
  );

  return (
    <article className="space-y-3 border-b px-4 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {managerUser && (
            <div>
              <p className="font-medium">{managerUser.name || managerUser.email}</p>
              <p className="text-xs text-muted-foreground">{managerUser.department ?? "No department"}</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{leave.type}</Badge>
            <Badge variant={statusVariant(leave.status)}>{leave.status}</Badge>
          </div>
        </div>
        <div className="shrink-0">
          {canReview && managerUser
            ? <LeaveReviewDialog leave={{ ...leave, user: managerUser }} />
            : managerUser && leave.status === LeaveStatus.PENDING
              ? <span className="text-xs text-muted-foreground">Self-review blocked</span>
              : !managerUser && leave.status === LeaveStatus.PENDING
                ? <CancelLeaveButton id={leave.id} />
                : null}
        </div>
      </div>
      <p className="text-sm font-medium">
        {formatDate(leave.startDate)} <span className="text-muted-foreground">to</span> {formatDate(leave.endDate)}
      </p>
      <LeaveDays
        totalDays={leave.totalDays}
        netLeaveDays={leave.netLeaveDays}
        sundayCount={leave.sundayCount}
        holidayCount={leave.holidayCount}
      />
      <p className="break-words text-sm">{leave.reason}</p>
      <p className="break-words text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Manager comment: </span>
          {leave.managerComment || "—"}
      </p>
    </article>
  );
}

function Pagination({
  query,
  pageKey,
  page,
  pageSize,
  totalCount,
}: {
  query: URLSearchParams;
  pageKey: string;
  page: number;
  pageSize: number;
  totalCount: number;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrevious = page > 0;
  const hasNext = page + 1 < totalPages;

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        Page {page + 1} of {totalPages} · {totalCount} request(s)
      </span>
      <div className="flex gap-2">
        {hasPrevious ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildPageHref(query, pageKey, page - 1)}>Previous</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>Previous</Button>
        )}
        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={buildPageHref(query, pageKey, page + 1)}>Next</Link>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>Next</Button>
        )}
      </div>
    </div>
  );
}

function RequestsTable({
  rows,
  managerView,
  viewerId,
}: {
  rows: readonly LeaveRequestRow[];
  managerView: boolean;
  viewerId: string;
}) {
  const managerRows = managerView
    ? rows.filter((row): row is ManagerLeaveRequestRow => "user" in row)
    : [];

  return (
    <>
      <div className="divide-y rounded-lg border lg:hidden">
        {managerView
          ? managerRows.map((leave) => (
              <LeaveRequestCard
                key={leave.id}
                leave={leave}
                managerUser={leave.user}
                viewerId={viewerId}
              />
            ))
          : rows.map((leave) => (
              <LeaveRequestCard key={leave.id} leave={leave} viewerId={viewerId} />
            ))}
        {rows.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">No leave requests found.</p>
        )}
      </div>
      <div className="hidden overflow-x-auto lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            {managerView && <TableHead>Employee</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Manager comment</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managerView
            ? managerRows.map((leave) => (
                <LeaveTableRow
                  key={leave.id}
                  leave={leave}
                  managerUser={leave.user}
                  viewerId={viewerId}
                />
              ))
            : rows.map((leave) => (
                <LeaveTableRow key={leave.id} leave={leave} viewerId={viewerId} />
              ))}
        </TableBody>
      </Table>
      </div>
    </>
  );
}

export default async function LeavesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParameters>;
}) {
  const user = await requireLeaveUser();
  const query = await searchParams;
  const isManager = isLeaveManager(user);
  const isStaff = user.role === UserRole.STAFF;
  const pageSize = 20;
  const managerPage = parsedPage(first(query.page));
  const ownPage = parsedPage(first(isManager ? query.myPage : query.page));
  const search = first(query.search)?.trim() || undefined;
  const type = first(query.type) || undefined;
  const status = first(query.status) || undefined;
  const department = first(query.department) || undefined;
  const fromDate = first(query.fromDate) || undefined;
  const throughDate = first(query.throughDate) || undefined;
  const activeFilterCount = [
    search,
    type,
    status,
    department,
    fromDate,
    throughDate,
  ].filter(Boolean).length;

  const managerResult = isManager
    ? await getAllLeaveRequestsAction({
        page: managerPage,
        pageSize,
        search,
        type,
        status,
        department,
        fromDate,
        throughDate,
      })
    : null;
  const ownResult = isStaff
    ? await getMyLeaveRequestsAction({ page: ownPage, pageSize })
    : null;
  const balance = isStaff
    ? await getAnnualLeaveBalanceAction({ month: formatInIST(new Date(), "yyyy-MM") })
    : null;

  const managerQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({
    search,
    type,
    status,
    department,
    fromDate,
    throughDate,
  })) {
    if (value) managerQuery.set(key, value);
  }
  const ownQuery = new URLSearchParams();
  if (isManager) {
    for (const [key, value] of managerQuery) ownQuery.set(key, value);
  }

  return (
    <DashboardContainer title="Leaves">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Leave management</h2>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Review leave requests across the organization."
            : "Request time away and follow the status of your requests."}
        </p>
      </header>

      {isStaff && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Request leave</CardTitle>
              <CardDescription>
                Submit a request for review. Pending requests do not reserve paid Annual Leave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveRequestForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Annual Leave allowance</CardTitle>
              <CardDescription>
                {balance?.month}: one paid day is available per calendar month; unused days expire at month-end and do not carry forward.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {balance?.approvedDays} approved of {balance?.entitledDays} paid day(s) used ·{" "}
                <strong>{balance?.remainingDays} remaining</strong>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sick, Casual, and Unpaid leave are not paid leave. Annual Leave approval checks each month in the requested date range.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>My requests</CardTitle>
              <CardDescription>
                You can cancel only your own pending requests. New requests cannot overlap pending or approved leave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ownResult?.leaves.length ? (
                <>
                  <RequestsTable
                    rows={ownResult.leaves}
                    managerView={false}
                    viewerId={user.id}
                  />
                  <Pagination
                    query={ownQuery}
                    pageKey={isManager ? "myPage" : "page"}
                    page={ownPage}
                    pageSize={ownResult.pageSize}
                    totalCount={ownResult.totalCount}
                  />
                </>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-10 text-center">
                  <p className="font-medium">No leave requests yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Your requests will appear here after submission.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {isManager && managerResult && (
        <Card>
          <CardHeader>
            <CardTitle>Organization leave requests</CardTitle>
            <CardDescription>
              HR staff, Admin, and Super Admin can approve or reject any staff request in one step. Self-review is not allowed.
            </CardDescription>
          </CardHeader>
          <CardContent className="border-b">
            <details className="group lg:contents">
              <summary className="mb-3 flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md border bg-background px-3 text-sm font-medium outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal aria-hidden="true" className="size-4 text-primary" />
                  Filter requests
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {activeFilterCount ? `${activeFilterCount} active` : "Optional"}
                </span>
              </summary>
            <form method="get" action="/dashboard/leaves" className="hidden grid-cols-2 gap-3 group-open:grid lg:grid lg:grid-cols-4">
              <input
                name="search"
                defaultValue={search}
                placeholder="Employee name or email"
                className="col-span-2 h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm lg:col-span-1"
                aria-label="Search employee"
              />
              <select name="type" defaultValue={type ?? ""} className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm sm:px-3" aria-label="Filter by leave type">
                <option value="">All types</option>
                {Object.values(LeaveType).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select name="status" defaultValue={status ?? ""} className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm sm:px-3" aria-label="Filter by status">
                <option value="">All statuses</option>
                {Object.values(LeaveStatus).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <select name="department" defaultValue={department ?? ""} className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm sm:px-3" aria-label="Filter by department">
                <option value="">All departments</option>
                {Object.values(Department).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
              <label className="min-w-0 space-y-1 text-xs text-muted-foreground">
                Requests overlapping from
                <input name="fromDate" type="date" defaultValue={fromDate ?? ""} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground sm:px-3" />
              </label>
              <label className="min-w-0 space-y-1 text-xs text-muted-foreground">
                Requests overlapping through
                <input name="throughDate" type="date" defaultValue={throughDate ?? ""} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm text-foreground sm:px-3" />
              </label>
              <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
                <Button type="submit" className="min-h-10 flex-1 lg:flex-none">Apply filters</Button>
                <Button asChild variant="outline" className="min-h-10 flex-1 lg:flex-none"><Link href="/dashboard/leaves">Clear</Link></Button>
              </div>
            </form>
            </details>
          </CardContent>
          <CardContent className="pt-6">
            {managerResult.leaves.length > 0 ? (
              <>
                <RequestsTable
                  rows={managerResult.leaves}
                  managerView
                  viewerId={user.id}
                />
                <Pagination
                  query={managerQuery}
                  pageKey="page"
                  page={managerPage}
                  pageSize={managerResult.pageSize}
                  totalCount={managerResult.totalCount}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center">
                <p className="font-medium">No leave requests found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try changing the filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardContainer>
  );
}
