"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileBarChart2, Folder, Search } from "lucide-react";

import { getBusinessReport } from "@/actions/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reportCatalog, reportGroups, type ReportId } from "@/lib/reports/report-catalog";

type ReportRow = { id: string; [key: string]: string | number | null };
type ReportResult = {
  rows: ReportRow[];
  summary: Array<{ label: string; value: number | string }>;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  startDate: string;
  endDate: string;
};

type ReportFilters = {
  startDate: string;
  endDate: string;
  search: string;
  status: string;
  page: number;
};

type Props = {
  allowedReports: ReportId[];
  initialReportId: ReportId | null;
  initialFilters: Omit<ReportFilters, "page">;
  initialReport: ReportResult | null;
  initialError: string | null;
};

const dateLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const invoiceStatusOptions = [
  ["DRAFT", "Draft"],
  ["SENT", "Sent"],
  ["PARTIALLY_PAID", "Partially paid"],
  ["PAID", "Paid"],
  ["OVERDUE", "Overdue"],
  ["VOID", "Void"],
] as const;
const expenseStatusOptions = [
  ["PENDING", "Pending"],
  ["COMPLETED", "Completed"],
  ["CANCELLED", "Cancelled"],
  ["REVERSED", "Reversed"],
] as const;
const proposalStatusOptions = [
  ["DRAFT", "Draft"],
  ["SENT", "Sent"],
  ["ACCEPTED", "Accepted"],
  ["REJECTED", "Rejected"],
  ["EXPIRED", "Expired"],
] as const;

function displayValue(value: string | number | null, key: string) {
  if (value === null || value === "") return "—";
  if (typeof value !== "number") return value;
  if (/sales|total|outstanding|received|paid|amount/i.test(key)) return currencyFormatter.format(value);
  return value.toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const encodeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const content = [headers, ...rows].map((row) => row.map(encodeCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsCenter({
  allowedReports,
  initialReportId,
  initialFilters,
  initialReport,
  initialError,
}: Props) {
  const router = useRouter();
  const visibleReports = useMemo(
    () => reportCatalog.filter((report) => allowedReports.includes(report.id)),
    [allowedReports],
  );
  const [selectedReportId, setSelectedReportId] = useState<ReportId | null>(
    initialReportId && allowedReports.includes(initialReportId) ? initialReportId : null,
  );
  const [filters, setFilters] = useState<ReportFilters>({ ...initialFilters, page: 0 });
  const [report, setReport] = useState<ReportResult | null>(initialReport);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [catalogSearch, setCatalogSearch] = useState("");

  const selectedDefinition = visibleReports.find((definition) => definition.id === selectedReportId) ?? null;
  const statusOptions = selectedReportId === "invoice-details"
    ? invoiceStatusOptions
    : selectedReportId === "proposal-details"
      ? proposalStatusOptions
      : selectedReportId === "expenses-by-category" || selectedReportId === "expenses-by-vendor"
        ? expenseStatusOptions
        : null;
  const searchedReports = visibleReports.filter((definition) =>
    `${definition.title} ${definition.description} ${definition.group}`
      .toLocaleLowerCase()
      .includes(catalogSearch.toLocaleLowerCase()),
  );

  async function loadReport(reportId: ReportId, nextFilters: ReportFilters) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await getBusinessReport({
        reportId,
        ...nextFilters,
        pageSize: 25,
      });
      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        setReport(null);
        return;
      }
      setReport(response.data);
      setFilters(nextFilters);
    } catch {
      setErrorMessage("Could not load this report. Try again.");
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }

  function selectReport(reportId: ReportId) {
    setSelectedReportId(reportId);
    const nextFilters = { ...filters, status: "ALL", page: 0 };
    setReport(null);
    setErrorMessage(null);
    const params = new URLSearchParams({ report: reportId });
    addFiltersToUrl(params, nextFilters);
    router.replace(`/dashboard/reports?${params.toString()}`);
    void loadReport(reportId, nextFilters);
  }

  function handleRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReportId) return;
    const formData = new FormData(event.currentTarget);
    const nextFilters: ReportFilters = {
      ...filters,
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      search: String(formData.get("search") ?? "").trim(),
      status: String(formData.get("status") ?? "ALL"),
      page: 0,
    };
    const params = new URLSearchParams({ report: selectedReportId });
    addFiltersToUrl(params, nextFilters);
    router.replace(`/dashboard/reports?${params.toString()}`);
    void loadReport(selectedReportId, nextFilters);
  }

  function changePage(page: number) {
    if (!selectedReportId) return;
    void loadReport(selectedReportId, { ...filters, page });
  }

  async function exportReport() {
    if (!selectedReportId || !report) return;
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const response = await getBusinessReport({
        reportId: selectedReportId,
        ...filters,
        page: 0,
        pageSize: 5000,
      });
      if (!response.success || !response.data) {
        setErrorMessage(response.message);
        return;
      }
      const definition = selectedDefinition;
      if (!definition) return;
      downloadCsv(
        `${selectedReportId}-${response.data.startDate}-to-${response.data.endDate}.csv`,
        definition.columns.map((column) => column.label),
        response.data.rows.map((row) => definition.columns.map(({ key }) => String(row[key] ?? ""))),
      );
    } catch {
      setErrorMessage("Could not export this report. Try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function backToCatalog() {
    setSelectedReportId(null);
    setReport(null);
    setErrorMessage(null);
    router.replace("/dashboard/reports");
  }

  function addFiltersToUrl(params: URLSearchParams, currentFilters: ReportFilters) {
    if (currentFilters.startDate) params.set("startDate", currentFilters.startDate);
    if (currentFilters.endDate) params.set("endDate", currentFilters.endDate);
    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.status !== "ALL") params.set("status", currentFilters.status);
  }

  return (
    <div className="space-y-5">
      {selectedDefinition ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Button variant="outline" size="icon" aria-label="Back to reports" onClick={backToCatalog}>
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <p className="text-sm text-muted-foreground">{selectedDefinition.group}</p>
                <h2 className="text-xl font-semibold tracking-tight">{selectedDefinition.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedDefinition.description}</p>
              </div>
            </div>
            <Button onClick={() => void exportReport()} disabled={!report || isExporting}>
              <Download className="size-4" />
              {isExporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>

          <Card className="shadow-none">
            <CardContent className="pt-4">
              <form onSubmit={handleRun} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(180px,1.5fr)_0.9fr_auto]">
                <div className="space-y-1.5">
                  <Label htmlFor="report-start-date">From date</Label>
                  <Input
                    id="report-start-date"
                    name="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="report-end-date">To date</Label>
                  <Input
                    id="report-end-date"
                    name="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="report-search">Search results</Label>
                  <Input
                    id="report-search"
                    name="search"
                    value={filters.search}
                    onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    placeholder="Search this report…"
                  />
                </div>
                {statusOptions && (
                  <div className="space-y-1.5">
                    <Label htmlFor="report-status">Status</Label>
                    <select
                      id="report-status"
                      name="status"
                      value={filters.status}
                      onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="ALL">Any status</option>
                      {statusOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-end">
                  <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading ? "Running…" : "Run report"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {errorMessage && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          {report && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {report.summary.map((item) => (
                  <Card key={item.label} className="shadow-none">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {typeof item.value === "number" && /sales|total|outstanding|received|amount/i.test(item.label)
                          ? currencyFormatter.format(item.value)
                          : typeof item.value === "number"
                            ? item.value.toLocaleString("en-IN", { maximumFractionDigits: 1 })
                            : item.value}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="shadow-none">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b bg-muted/30 py-3">
                  <CardTitle className="text-sm font-medium">
                    {dateLabelFormatter.format(new Date(`${report.startDate}T00:00:00.000Z`))}
                    {" – "}
                    {dateLabelFormatter.format(new Date(`${report.endDate}T00:00:00.000Z`))}
                  </CardTitle>
                  <Badge variant="outline">{report.totalCount.toLocaleString("en-IN")} results</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table className="min-w-[720px]">
                      <TableHeader>
                        <TableRow>
                          {selectedDefinition.columns.map((column) => (
                            <TableHead key={column.key} className={column.align === "right" ? "text-right" : undefined}>
                              {column.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.rows.map((row) => (
                          <TableRow key={row.id}>
                            {selectedDefinition.columns.map((column) => (
                              <TableCell
                                key={column.key}
                                className={`${column.align === "right" ? "text-right tabular-nums" : ""} ${column.key === "status" || column.key === "segment" ? "font-medium" : ""}`}
                              >
                                {displayValue(row[column.key], column.key)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {report.rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={selectedDefinition.columns.length} className="h-24 text-center text-muted-foreground">
                              No results match these filters.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground">
                      {report.totalCount === 0
                        ? "No results"
                        : `Showing ${report.page * report.pageSize + 1}–${Math.min((report.page + 1) * report.pageSize, report.totalCount)} of ${report.totalCount}`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={isLoading || report.page <= 0} onClick={() => changePage(report.page - 1)}>
                        Previous
                      </Button>
                      <span className="text-muted-foreground">
                        Page {report.totalPages === 0 ? 0 : report.page + 1} of {report.totalPages}
                      </span>
                      <Button variant="outline" size="sm" disabled={isLoading || report.page + 1 >= report.totalPages} onClick={() => changePage(report.page + 1)}>
                        Next
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {isLoading && !report && (
            <Card className="shadow-none">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">Loading report…</CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          <div className="mx-auto max-w-2xl space-y-3 text-center">
            <FileBarChart2 className="mx-auto size-7 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-semibold tracking-tight">Reports center</h2>
            <p className="text-sm text-muted-foreground">Choose a report to explore sales, outstanding balances, customers, and more.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search reports"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Search reports"
                className="pl-9"
              />
            </div>
          </div>
          <div className="mx-auto max-w-5xl space-y-5">
            {reportGroups.map((group) => {
              const groupReports = searchedReports.filter((definition) => definition.group === group);
              if (groupReports.length === 0) return null;
              return (
                <section key={group} aria-label={`${group} reports`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Folder className="size-4 text-muted-foreground" aria-hidden="true" />
                    <h3 className="text-sm font-semibold">{group}</h3>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {groupReports.map((definition) => (
                      <button
                        key={definition.id}
                        type="button"
                        onClick={() => selectReport(definition.id)}
                        className="rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="block text-sm font-medium text-primary">{definition.title}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{definition.description}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
            {searchedReports.length === 0 && (
              <p className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No reports match “{catalogSearch}”.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
