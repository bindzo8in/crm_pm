"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { DayPicker, type DateRange } from "react-day-picker";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AttendanceStatus, Department } from "@/app/generated/prisma/enums";
import { getAttendanceLogsAction } from "@/actions/attendance";
import { RegularizationModal } from "./regularization-modal";
import { AttendanceAuditViewer } from "./attendance-audit-viewer";
import { ManualAttendanceEntryDialog } from "./manual-attendance-entry-dialog";
import { formatInIST, formatTimeInIST } from "@/lib/date";
import {
  LaptopIcon,
  Building2Icon,
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  FileEditIcon,
  HistoryIcon,
  Clock3,
  MapPin,
  CalendarDaysIcon,
  ChevronDownIcon,
  EllipsisIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AttendanceTableProps {
  userRole: string;
  userDepartment?: string;
}

export function AttendanceTable({ userRole, userDepartment }: AttendanceTableProps) {
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userDepartment === "HR";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  const [selectedRecordForReg, setSelectedRecordForReg] = useState<any | null>(null);
  const [selectedRecordForAudit, setSelectedRecordForAudit] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAttendanceLogsAction({
        page,
        limit: 10,
        status: statusFilter !== "ALL" ? (statusFilter as AttendanceStatus) : undefined,
        department: departmentFilter !== "ALL" ? (departmentFilter as Department) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(res?.records || []);
      setTotalPages(res?.totalPages || 1);
      setTotalCount(res?.totalCount || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch attendance logs");
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, endDate, page, startDate, statusFilter]);

  useEffect(() => {
    // Load records whenever the applied filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs();
  }, [fetchLogs]);

  const getStatusBadge = (status: string, workMinutes?: number, clockOut?: string | null) => {
    switch (status) {
      case "PRESENT":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold">PRESENT</Badge>;
      case "LATE":
        return <Badge variant="destructive" className="font-semibold">LATE</Badge>;
      case "HALF_DAY":
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold">
              HALF DAY
            </Badge>
            {clockOut && workMinutes !== undefined && workMinutes > 0 && workMinutes < 240 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                <span className="inline-flex items-center gap-1">
                  <Clock3 aria-hidden="true" className="size-3" />
                  &lt; 4h ({Math.floor(workMinutes / 60)}h {workMinutes % 60}m)
                </span>
              </span>
            )}
          </div>
        );
      case "ABSENT":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 font-semibold">ABSENT</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWorkModeIcon = (mode: string) => {
    switch (mode) {
      case "REMOTE":
        return <HomeIcon className="w-3.5 h-3.5 mr-1" />;
      case "HYBRID":
        return <LaptopIcon className="w-3.5 h-3.5 mr-1" />;
      default:
        return <Building2Icon className="w-3.5 h-3.5 mr-1" />;
    }
  };

  const formatDuration = (clockIn: string, clockOut?: string, breaks: any[] = []) => {
    if (!clockOut) return "In Progress";
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    let diff = end - start;

    for (const b of breaks) {
      if (b.breakStart && b.breakEnd) {
        diff -= (new Date(b.breakEnd).getTime() - new Date(b.breakStart).getTime());
      }
    }

    if (diff < 0) diff = 0;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const activeFilterCount = [
    statusFilter !== "ALL",
    departmentFilter !== "ALL",
    Boolean(startDate || endDate),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setPage(1);
    setStatusFilter("ALL");
    setDepartmentFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  const selectedDateRange: DateRange | undefined = startDate || endDate
    ? {
        from: startDate ? parseISO(startDate) : undefined,
        to: endDate ? parseISO(endDate) : undefined,
      }
    : undefined;
  const dateRangeLabel = startDate || endDate
    ? `${startDate ? format(parseISO(startDate), "MMM d, yyyy") : "Start date"} – ${endDate ? format(parseISO(endDate), "MMM d, yyyy") : "End date"}`
    : "Choose date range";

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Search and Filters Header */}
      <Card className="border border-border/60 bg-card shadow-md rounded-3xl p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <FilterIcon className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold sm:text-lg">Attendance History</h2>
            <Badge variant="secondary" className="text-xs">{totalCount} Logs</Badge>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={filtersOpen ? "Hide attendance filters" : "Show attendance filters"}
              aria-expanded={filtersOpen}
              aria-controls="attendance-history-filters"
              onClick={() => setFiltersOpen((open) => !open)}
              className="rounded-xl"
            >
              <FilterIcon aria-hidden="true" className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 size-5 justify-center rounded-full p-0 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDownIcon aria-hidden="true" className={`ml-1 size-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </Button>

            {isAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={() => setManualEntryOpen(true)}
                className="hidden rounded-xl text-xs font-semibold shadow-sm sm:inline-flex"
              >
                <PlusIcon aria-hidden="true" className="mr-1 size-3.5" />
                Add entry
              </Button>
            )}
            {isAdmin && (
              <div className="sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="icon" aria-label="Attendance actions" className="size-9 rounded-xl">
                      <EllipsisIcon aria-hidden="true" className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => setManualEntryOpen(true)}>
                      <PlusIcon aria-hidden="true" />
                      Add attendance entry
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {isAdmin && (
              <ManualAttendanceEntryDialog
                hideTrigger
                open={manualEntryOpen}
                onOpenChange={setManualEntryOpen}
                onSuccess={fetchLogs}
              />
            )}
          </div>
        </div>

        {filtersOpen && (
          <div id="attendance-history-filters" className="mt-4 border-t border-border/60 pt-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="attendance-status-filter">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={(val) => { setPage(1); setStatusFilter(val); }}>
                  <SelectTrigger id="attendance-status-filter" className="w-full rounded-xl">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="LATE">Late</SelectItem>
                    <SelectItem value="HALF_DAY">Half day</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="attendance-department-filter">
                  Department
                </label>
                <Select value={departmentFilter} onValueChange={(val) => { setPage(1); setDepartmentFilter(val); }}>
                  <SelectTrigger id="attendance-department-filter" className="w-full rounded-xl">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All departments</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="DEVELOPMENT">Development</SelectItem>
                    <SelectItem value="DESIGN">Design</SelectItem>
                    <SelectItem value="SEO">SEO</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="OPERATIONS">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Date range</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start gap-2 rounded-xl text-left font-normal">
                      <CalendarDaysIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{dateRangeLabel}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Filter by date range</p>
                      <p className="text-xs text-muted-foreground">Choose a start and end date.</p>
                    </div>
                    <DayPicker
                      mode="range"
                      selected={selectedDateRange}
                      defaultMonth={selectedDateRange?.from}
                      onSelect={(range) => {
                        setPage(1);
                        setStartDate(range?.from ? format(range.from, "yyyy-MM-dd") : "");
                        setEndDate(range?.to ? format(range.to, "yyyy-MM-dd") : "");
                      }}
                      numberOfMonths={1}
                      className="w-full"
                      classNames={{
                        months: "w-full",
                        month: "w-full space-y-3",
                        month_caption: "flex h-9 items-center justify-center text-sm font-medium",
                        nav: "absolute inset-x-1 top-1 flex items-center justify-between",
                        button_previous: "inline-flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        button_next: "inline-flex size-8 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        month_grid: "w-full border-collapse",
                        weekdays: "flex",
                        weekday: "flex-1 py-2 text-center text-xs font-normal text-muted-foreground",
                        week: "mt-1 flex w-full",
                        day: "relative size-9 flex-1 p-0 text-center text-sm",
                        day_button: "inline-flex size-9 items-center justify-center rounded-md text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        range_start: "rounded-l-md bg-primary text-primary-foreground",
                        range_middle: "rounded-none bg-primary/10 text-foreground",
                        range_end: "rounded-r-md bg-primary text-primary-foreground",
                        today: "font-semibold text-primary",
                        outside: "text-muted-foreground/50",
                        disabled: "pointer-events-none opacity-40",
                        hidden: "invisible",
                      }}
                    />
                    {(startDate || endDate) && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setPage(1); setStartDate(""); setEndDate(""); }} className="w-full">
                        Clear date range
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Desktop Table View */}
      <div className="hidden md:block border border-border/60 bg-card shadow-lg rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Clock In</TableHead>
              <TableHead className="font-semibold">Clock Out</TableHead>
              <TableHead className="font-semibold">Duration</TableHead>
              <TableHead className="font-semibold">Work Mode</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Loading attendance records...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No attendance records found matching your query.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                        {record.user?.name ? record.user.name[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {record.user?.name || "Employee"}
                          {(record.department || record.user?.department) && (
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              {record.department || record.user?.department}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{record.user?.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatInIST(new Date(record.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatTimeInIST(new Date(record.clockIn))}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {record.clockOut
                      ? formatTimeInIST(new Date(record.clockOut))
                      : "--:--"}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {formatDuration(record.clockIn, record.clockOut, record.breaks)}
                    {record.isManuallyEdited && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30">Manual Entry</Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="flex items-center w-fit text-[11px]">
                      {getWorkModeIcon(record.workMode)}
                      {record.workMode}
                    </Badge>
                    {record.workMode === "OFFICE" && record.distanceFromOffice != null && (
                      <div className="mt-0.5 inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-medium text-muted-foreground">
                        <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                        <span>
                          {record.distanceFromOffice >= 1000
                            ? `${(record.distanceFromOffice / 1000).toFixed(2)} km`
                            : `${record.distanceFromOffice}m`} away
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status, record.workMinutes, record.clockOut)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Regularize / Edit Attendance"
                          onClick={() => setSelectedRecordForReg(record)}
                        >
                          <FileEditIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="View Audit Trail"
                        onClick={() => setSelectedRecordForAudit(record.id)}
                      >
                        <HistoryIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading attendance logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">No attendance logs found.</div>
        ) : (
          logs.map((record) => (
            <Card key={record.id} className="border border-border/60 bg-card shadow-md rounded-2xl p-4 space-y-3">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {record.user?.name ? record.user.name[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{record.user?.name || "Employee"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatInIST(new Date(record.date), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {getStatusBadge(record.status, record.workMinutes, record.clockOut)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`More actions for ${record.user?.name || "employee"} attendance`}
                        className="size-8 rounded-lg"
                      >
                        <EllipsisIcon aria-hidden="true" className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isAdmin && (
                        <DropdownMenuItem onSelect={() => setSelectedRecordForReg(record)}>
                          <FileEditIcon aria-hidden="true" />
                          Edit attendance
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onSelect={() => setSelectedRecordForAudit(record.id)}>
                        <HistoryIcon aria-hidden="true" />
                        View audit trail
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-xl">
                <div>
                  <span className="text-muted-foreground text-[10px]">Clock In</span>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatTimeInIST(new Date(record.clockIn))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px]">Clock Out</span>
                  <div className="font-semibold text-rose-600 dark:text-rose-400">
                    {record.clockOut
                      ? formatTimeInIST(new Date(record.clockOut))
                      : "In Progress"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {getWorkModeIcon(record.workMode)}
                  <span>{record.workMode}</span>
                  <span>•</span>
                  <span>{formatDuration(record.clockIn, record.clockOut, record.breaks)}</span>
                  {record.isManuallyEdited && (
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30 ml-1">Manual</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-xl"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" /> Previous
          </Button>

          <span className="text-xs text-muted-foreground font-medium">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl"
          >
            Next <ChevronRightIcon className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Regularization Modal */}
      {selectedRecordForReg && (
        <RegularizationModal
          isOpen={!!selectedRecordForReg}
          onClose={() => setSelectedRecordForReg(null)}
          record={selectedRecordForReg}
          onSuccess={fetchLogs}
        />
      )}

      {/* Audit Trail Viewer */}
      {selectedRecordForAudit && (
        <AttendanceAuditViewer
          isOpen={!!selectedRecordForAudit}
          onClose={() => setSelectedRecordForAudit(null)}
          recordId={selectedRecordForAudit}
        />
      )}
    </div>
  );
}
