import Link from "next/link";
import { CalendarDays, CheckCheck, Clock3, ShieldCheck, SlidersHorizontal, XCircle } from "lucide-react";
import { LeaveStatus, LeaveType, UserRole } from "@/app/generated/prisma/enums";
import {
  getAllLeaveRequestsAction,
  getAnnualLeaveBalanceAction,
  getLeaveManagementSummaryAction,
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
import { LeaveManagerFilters } from "./leave-manager-filters";
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

function buildStatusHref(query: URLSearchParams, status?: LeaveStatus): string {
  const next = new URLSearchParams(query);
  next.delete("status");
  next.delete("page");
  if (status) next.set("status", status);
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
  const mySearch = first(query.mySearch)?.trim() || undefined;
  const myType = first(query.myType) || undefined;
  const myStatus = first(query.myStatus) || undefined;
  const activeFilterCount = [
    search,
    type,
    status,
    department,
    fromDate,
    throughDate,
  ].filter(Boolean).length;

  const [managerResult, managerSummary, ownResult, balance] = await Promise.all([
    isManager
      ? getAllLeaveRequestsAction({
          page: managerPage,
          pageSize,
          search,
          type,
          status,
          department,
          fromDate,
          throughDate,
        })
      : Promise.resolve(null),
    isManager ? getLeaveManagementSummaryAction() : Promise.resolve(null),
    isStaff
      ? getMyLeaveRequestsAction({
          page: ownPage,
          pageSize,
          search: mySearch,
          type: myType,
          status: myStatus,
        })
      : Promise.resolve(null),
    isStaff
      ? getAnnualLeaveBalanceAction({ month: formatInIST(new Date(), "yyyy-MM") })
      : Promise.resolve(null),
  ]);

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
  for (const [key, value] of Object.entries({
    mySearch,
    myType,
    myStatus,
  })) {
    if (value) ownQuery.set(key, value);
  }

  return (
    <DashboardContainer title="Leaves">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {isManager ? "Leave Requests & Approvals" : "Leave management"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Review staff requests, track coverage, and apply leave policy consistently."
            : "Request time away and follow the status of your requests."}
        </p>
      </header>

      {isStaff && (
        <>
          <section aria-label="Leave allowance" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="border-primary/20 bg-primary/[0.03] shadow-none">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Annual Leave · {balance?.month}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-4xl font-semibold tabular-nums tracking-tight">{balance?.remainingDays ?? 0}</p>
                  <span className="text-sm text-muted-foreground">paid day(s) remaining</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {balance?.approvedDays ?? 0} of {balance?.entitledDays ?? 1} monthly day approved. Unused days expire at month-end.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Paid leave allowance</p>
                <p className="mt-3 text-lg font-semibold">1 Annual day each month</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Approval checks each month in the requested date range. Sick, Casual, and Unpaid leave are unpaid.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none sm:col-span-2 xl:col-span-1">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Request history</p>
                <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">{ownResult?.totalCount ?? 0}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Your submitted requests, including past decisions.</p>
              </CardContent>
            </Card>
          </section>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Request leave</CardTitle>
              <CardDescription>
                Select a date range and leave type. Pending requests do not reserve paid Annual Leave.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveRequestForm today={formatInIST(new Date(), "yyyy-MM-dd")} />
            </CardContent>
          </Card>
          <Card className="min-w-0 shadow-none">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>My requests</CardTitle>
                <CardDescription className="mt-1">
                  You can cancel only your own pending requests. New requests cannot overlap pending or approved leave.
                </CardDescription>
              </div>
              <form method="get" action="/dashboard/leaves" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                <label className="relative min-w-0">
                  <span className="sr-only">Search leave reasons</span>
                  <input
                    name="mySearch"
                    defaultValue={mySearch}
                    placeholder="Search request reason"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <select name="myType" defaultValue={myType ?? ""} className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by leave type">
                  <option value="">All types</option>
                  {Object.values(LeaveType).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select name="myStatus" defaultValue={myStatus ?? ""} className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by request status">
                  <option value="">All statuses</option>
                  {Object.values(LeaveStatus).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <Button type="submit" variant="outline">Filter</Button>
              </form>
            </CardHeader>
            <CardContent>
              {ownResult?.leaves.length ? (
                <>
                  <RequestsTable rows={ownResult.leaves} managerView={false} viewerId={user.id} />
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
                  <p className="font-medium">{mySearch || myType || myStatus ? "No matching requests" : "No leave requests yet"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mySearch || myType || myStatus
                      ? "Try changing or clearing the filters."
                      : "Your requests will appear here after submission."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {isManager && managerResult && (
        <>
          <section aria-label="Leave request summary" className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Awaiting review", value: managerSummary?.pendingCount ?? 0, icon: Clock3, tone: "text-primary", detail: "Requests needing a decision" },
              { label: "On leave today", value: managerSummary?.onLeaveTodayCount ?? 0, icon: CalendarDays, tone: "text-sky-700 dark:text-sky-400", detail: "Approved staff absences" },
              { label: "Approved requests", value: managerSummary?.approvedCount ?? 0, icon: CheckCheck, tone: "text-emerald-700 dark:text-emerald-400", detail: "Approved across the organization" },
              { label: "Rejected requests", value: managerSummary?.rejectedCount ?? 0, icon: XCircle, tone: "text-destructive", detail: "Rejected across the organization" },
            ].map((metric) => {
              const MetricIcon = metric.icon;
              return (
                <Card key={metric.label} className="min-w-0 shadow-none">
                  <CardContent className="flex items-start justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-muted-foreground">{metric.label}</p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{metric.value.toLocaleString("en-IN")}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{metric.detail}</p>
                    </div>
                    <span className={`rounded-lg bg-muted p-2.5 ${metric.tone}`}>
                      <MetricIcon aria-hidden="true" className="size-5" />
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <Card className="min-w-0 shadow-none">
            <CardHeader className="gap-4 border-b bg-muted/20 pb-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base">Organization leave requests</CardTitle>
                  <CardDescription className="mt-1">
                    Review requests by status. Self-review is blocked for all managers.
                  </CardDescription>
                </div>
                <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1" aria-label="Filter by request status">
                  {[
                    { label: "All requests", value: undefined, count: managerSummary?.totalCount ?? managerResult.totalCount },
                    { label: "Pending", value: LeaveStatus.PENDING, count: managerSummary?.pendingCount ?? 0 },
                    { label: "Approved", value: LeaveStatus.APPROVED, count: managerSummary?.approvedCount ?? 0 },
                    { label: "Rejected", value: LeaveStatus.REJECTED, count: managerSummary?.rejectedCount ?? 0 },
                  ].map((tab) => {
                    const active = (status ?? undefined) === tab.value;
                    return (
                      <Link
                        key={tab.label}
                        href={buildStatusHref(managerQuery, tab.value)}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${active ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {tab.label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-primary text-primary-foreground" : "bg-background/70 text-muted-foreground"}`}>
                          {tab.count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <LeaveManagerFilters
                search={search}
                department={department}
                type={type}
                fromDate={fromDate}
                throughDate={throughDate}
                status={status}
                activeFilterCount={activeFilterCount}
              />
            </CardHeader>
            <CardContent className="px-0 pt-0">
              {managerResult.leaves.length > 0 ? (
                <>
                  <RequestsTable
                    rows={managerResult.leaves}
                    managerView
                    viewerId={user.id}
                  />
                  <div className="px-4 pb-4">
                    <Pagination
                      query={managerQuery}
                      pageKey="page"
                      page={managerPage}
                      pageSize={managerResult.pageSize}
                      totalCount={managerResult.totalCount}
                    />
                  </div>
                </>
              ) : (
                <div className="grid min-h-48 place-items-center px-6 py-10 text-center">
                  <div>
                    <span className="mx-auto grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                      <SlidersHorizontal aria-hidden="true" className="size-5" />
                    </span>
                    <p className="mt-3 font-medium">No leave requests found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeFilterCount ? "Try changing or clearing the filters." : "New staff requests will appear here."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <aside className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4 sm:items-center">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary sm:mt-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Leave policy safeguards</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sundays and configured holidays are excluded from chargeable leave days. Annual Leave availability is checked for each month when a request is approved.
              </p>
            </div>
          </aside>
        </>
      )}
    </DashboardContainer>
  );
}
