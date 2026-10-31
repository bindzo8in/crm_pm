"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalarySlipGenerateDialog } from "./salary-slip-generate-dialog";
import { SalarySlipMarkPaidDialog } from "./salary-slip-mark-paid-dialog";
import { SalarySlipAdjustmentsDialog } from "./salary-slip-adjustments-dialog";
import { formatCurrency } from "@/lib/utils";
import {
  PlusIcon,
  DownloadIcon,
  EyeIcon,
  DollarSignIcon,
  PencilIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import type { SalaryEmployee, SalarySlipRecord, SalarySlipUpdate } from "./types";

interface SalarySlipsTabProps {
  users: SalaryEmployee[];
  initialSlips: SalarySlipRecord[];
  isHrOrAdmin: boolean;
}

export function SalarySlipsTab({ users, initialSlips, isHrOrAdmin }: SalarySlipsTabProps) {
  const [slips, setSlips] = useState<SalarySlipRecord[]>(initialSlips);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | SalarySlipRecord["status"]>("ALL");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [markPaidSlipId, setMarkPaidSlipId] = useState<string | null>(null);
  const [adjustmentSlip, setAdjustmentSlip] = useState<SalarySlipRecord | null>(null);

  const getMonthName = (m: number) => {
    const d = new Date(2000, m - 1, 1);
    return d.toLocaleString('default', { month: 'long' });
  };

  const visibleSlips = slips.filter((slip) => {
    const matchesSearch = `${slip.user?.name ?? ""} ${slip.user?.department ?? ""}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    return matchesSearch && (statusFilter === "ALL" || slip.status === statusFilter);
  });

  const slipsByYear = visibleSlips.reduce<Array<{ year: number; months: Array<{ month: number; slips: SalarySlipRecord[] }> }>>(
    (years, slip) => {
      let yearGroup = years.find((group) => group.year === slip.year);
      if (!yearGroup) {
        yearGroup = { year: slip.year, months: [] };
        years.push(yearGroup);
      }

      let monthGroup = yearGroup.months.find((group) => group.month === slip.month);
      if (!monthGroup) {
        monthGroup = { month: slip.month, slips: [] };
        yearGroup.months.push(monthGroup);
      }

      monthGroup.slips.push(slip);
      return years;
    },
    []
  );
  slipsByYear.sort((a, b) => b.year - a.year);
  slipsByYear.forEach((yearGroup) => yearGroup.months.sort((a, b) => b.month - a.month));

  const handleSuccess = (newSlip: SalarySlipRecord) => {
    setSlips(prev => [newSlip, ...prev.filter(s => s.id !== newSlip.id)]);
  };

  const handleMarkPaidSuccess = (updatedSlip: SalarySlipUpdate) => {
    setSlips(prev => prev.map(s => s.id === updatedSlip.id ? { ...s, ...updatedSlip } : s));
  };

  const handleAdjustmentsSuccess = (updatedSlip: SalarySlipUpdate) => {
    setSlips(prev => prev.map(s => s.id === updatedSlip.id ? { ...s, ...updatedSlip } : s));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Salary slips</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review monthly payroll and payment status.</p>
          </div>
        {isHrOrAdmin && (
          <Button onClick={() => setIsGenerateOpen(true)} className="min-h-11 w-full sm:w-auto">
            <PlusIcon aria-hidden="true" className="mr-2 size-4" /> Generate slip
          </Button>
        )}
        </div>
        <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_12rem] sm:p-4">
          <div className="relative">
            <SearchIcon aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              aria-label="Search salary slips"
              placeholder="Search employee or department"
              className="h-11 pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "ALL" | SalarySlipRecord["status"])}>
            <SelectTrigger aria-label="Filter salary slips by status" className="h-11">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="GENERATED">Generated</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="min-w-0 overflow-hidden rounded-xl border py-0">
        <div className="divide-y lg:hidden">
          {visibleSlips.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {slips.length === 0 ? "No salary slips generated yet. Generate a slip to see it here." : "No salary slips match the current filters."}
            </p>
          ) : slipsByYear.map((yearGroup, yearIndex) => (
            <details key={yearGroup.year} open={yearIndex === 0} className="group border-b last:border-b-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                <CalendarDaysIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span className="tabular-nums">{yearGroup.year}</span>
                <span className="ml-auto rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {yearGroup.months.reduce((count, month) => count + month.slips.length, 0)} slips
                </span>
                <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t bg-muted/10">
                {yearGroup.months.map((monthGroup, monthIndex) => (
                  <details key={`${yearGroup.year}-${monthGroup.month}`} open={yearIndex === 0 && monthIndex === 0} className="group/month border-b last:border-b-0">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 border-l-2 border-transparent py-2.5 pl-5 pr-4 text-sm text-foreground outline-none transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:pl-7 [&::-webkit-details-marker]:hidden">
                      <span className="font-medium">{getMonthName(monthGroup.month)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {monthGroup.slips.length} {monthGroup.slips.length === 1 ? "slip" : "slips"}
                      </span>
                      <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open/month:rotate-180" />
                    </summary>
                    <div className="divide-y border-t bg-background">
                      {monthGroup.slips.map((slip) => (
                    <article key={slip.id} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-medium text-foreground">{slip.user?.name}</h3>
                          <p className="text-xs text-muted-foreground">{slip.user?.department || "Not assigned"}</p>
                        </div>
                        <Badge variant={slip.status === "PAID" ? "default" : "secondary"} className="shrink-0 text-xs">
                          {slip.status}
                        </Badge>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3">
                        <div className="space-y-1">
                          <dt className="text-xs text-muted-foreground">Net payable</dt>
                          <dd className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(Number(slip.netSalary))}
                          </dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-xs text-muted-foreground">Attendance</dt>
                          <dd className="text-xs">
                            Paid: <span className="font-bold">{slip.paidDays}</span> / {slip.totalDays}
                            <span className="ml-3 text-muted-foreground">LOP:</span>{" "}
                            <span className="font-bold text-rose-500">{slip.absentDays}</span>
                          </dd>
                        </div>
                      </dl>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild className="size-10 text-muted-foreground hover:text-foreground">
                          <Link href={`/s/${slip.id}`} target="_blank" aria-label={`View salary slip for ${slip.user?.name ?? "employee"}`}>
                            <EyeIcon aria-hidden="true" className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild className="size-10 text-muted-foreground hover:text-foreground">
                          <a href={`/api/salary/slips/${slip.id}/pdf`} target="_blank" rel="noreferrer" aria-label={`Download salary slip for ${slip.user?.name ?? "employee"}`}>
                            <DownloadIcon aria-hidden="true" className="size-4" />
                          </a>
                        </Button>
                        {isHrOrAdmin && slip.status === "GENERATED" && (
                          <>
                            <Button variant="ghost" size="icon" className="size-10 text-muted-foreground hover:text-foreground" onClick={() => setAdjustmentSlip(slip)} aria-label={`Adjust salary slip for ${slip.user?.name ?? "employee"}`}>
                              <PencilIcon aria-hidden="true" className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-10 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400" onClick={() => setMarkPaidSlipId(slip.id)} aria-label={`Mark salary slip for ${slip.user?.name ?? "employee"} as paid`}>
                              <DollarSignIcon aria-hidden="true" className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </article>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>

        <div className="hidden lg:block">
          {visibleSlips.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {slips.length === 0 ? "No salary slips generated yet. Generate a slip to see it here." : "No salary slips match the current filters."}
            </p>
          ) : slipsByYear.map((yearGroup, yearIndex) => (
            <details key={yearGroup.year} open={yearIndex === 0} className="group border-b last:border-b-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                <CalendarDaysIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span className="tabular-nums">{yearGroup.year}</span>
                <span className="ml-auto rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {yearGroup.months.reduce((count, month) => count + month.slips.length, 0)} slips
                </span>
                <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t bg-muted/10">
                {yearGroup.months.map((monthGroup, monthIndex) => (
                  <details key={`${yearGroup.year}-${monthGroup.month}`} open={yearIndex === 0 && monthIndex === 0} className="group/month border-b last:border-b-0">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 border-l-2 border-transparent py-2.5 pl-5 pr-4 text-sm text-foreground outline-none transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:pl-7 [&::-webkit-details-marker]:hidden">
                      <span className="font-medium">{getMonthName(monthGroup.month)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {monthGroup.slips.length} {monthGroup.slips.length === 1 ? "slip" : "slips"}
                      </span>
                      <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open/month:rotate-180" />
                    </summary>
                    <div className="overflow-x-auto border-t">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="font-semibold">Employee</TableHead>
                            <TableHead className="font-semibold">Attendance</TableHead>
                            <TableHead className="text-right font-semibold">Net payable</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthGroup.slips.map((slip) => (
                    <TableRow key={slip.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-foreground">{slip.user?.name}</div>
                        <div className="text-xs text-muted-foreground">{slip.user?.department || "Not assigned"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          <div>Paid: <span className="font-bold text-foreground">{slip.paidDays}</span> / {slip.totalDays}</div>
                          <div>LOP: <span className="font-bold text-rose-500">{slip.absentDays}</span></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(Number(slip.netSalary))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={slip.status === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                          {slip.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild className="size-10 text-muted-foreground hover:text-foreground">
                            <Link href={`/s/${slip.id}`} target="_blank" aria-label={`View salary slip for ${slip.user?.name ?? "employee"}`}>
                              <EyeIcon aria-hidden="true" className="size-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild className="size-10 text-muted-foreground hover:text-foreground">
                            <a href={`/api/salary/slips/${slip.id}/pdf`} target="_blank" rel="noreferrer" aria-label={`Download salary slip for ${slip.user?.name ?? "employee"}`}>
                              <DownloadIcon aria-hidden="true" className="size-4" />
                            </a>
                          </Button>
                          {isHrOrAdmin && slip.status === 'GENERATED' && (
                            <>
                              <Button variant="ghost" size="icon" className="size-10 text-muted-foreground hover:text-foreground" onClick={() => setAdjustmentSlip(slip)} aria-label={`Adjust salary slip for ${slip.user?.name ?? "employee"}`}>
                                <PencilIcon aria-hidden="true" className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-10 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400" onClick={() => setMarkPaidSlipId(slip.id)} aria-label={`Mark salary slip for ${slip.user?.name ?? "employee"} as paid`}>
                                <DollarSignIcon aria-hidden="true" className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Card>

      {isHrOrAdmin && (
        <SalarySlipGenerateDialog 
          isOpen={isGenerateOpen}
          onClose={() => setIsGenerateOpen(false)}
          users={users}
          onSuccess={handleSuccess}
        />
      )}

      {markPaidSlipId && (
        <SalarySlipMarkPaidDialog
          isOpen={!!markPaidSlipId}
          onClose={() => setMarkPaidSlipId(null)}
          slipId={markPaidSlipId}
          onSuccess={handleMarkPaidSuccess}
        />
      )}

      {adjustmentSlip && (
        <SalarySlipAdjustmentsDialog
          key={adjustmentSlip.id}
          isOpen={!!adjustmentSlip}
          onClose={() => setAdjustmentSlip(null)}
          slip={{
            id: adjustmentSlip.id,
            medicalReimbursement: Number(adjustmentSlip.medicalReimbursement ?? 0),
            extraEarnings: Number(adjustmentSlip.extraEarnings ?? 0),
            extraDeductions: Number(adjustmentSlip.extraDeductions ?? 0),
            netSalary: Number(adjustmentSlip.netSalary ?? 0),
          }}
          onSuccess={handleAdjustmentsSuccess}
        />
      )}
    </div>
  );
}
