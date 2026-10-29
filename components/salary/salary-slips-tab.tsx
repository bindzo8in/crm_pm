"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalarySlipGenerateDialog } from "./salary-slip-generate-dialog";
import { SalarySlipMarkPaidDialog } from "./salary-slip-mark-paid-dialog";
import { SalarySlipAdjustmentsDialog } from "./salary-slip-adjustments-dialog";
import { formatCurrency } from "@/lib/utils";
import { PlusIcon, DownloadIcon, EyeIcon, DollarSignIcon, PencilIcon, FolderIcon } from "lucide-react";
import Link from "next/link";
import type { SalaryEmployee, SalarySlipRecord, SalarySlipUpdate } from "./types";

interface SalarySlipsTabProps {
  users: SalaryEmployee[];
  initialSlips: SalarySlipRecord[];
  isHrOrAdmin: boolean;
}

export function SalarySlipsTab({ users, initialSlips, isHrOrAdmin }: SalarySlipsTabProps) {
  const [slips, setSlips] = useState<SalarySlipRecord[]>(initialSlips);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [markPaidSlipId, setMarkPaidSlipId] = useState<string | null>(null);
  const [adjustmentSlip, setAdjustmentSlip] = useState<SalarySlipRecord | null>(null);

  const getMonthName = (m: number) => {
    const d = new Date(2000, m - 1, 1);
    return d.toLocaleString('default', { month: 'long' });
  };

  const slipsByYear = slips.reduce<Array<{ year: number; months: Array<{ month: number; slips: SalarySlipRecord[] }> }>>(
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Salary slips</h2>
        {isHrOrAdmin && (
          <Button onClick={() => setIsGenerateOpen(true)} className="min-h-11 w-full sm:w-auto">
            <PlusIcon aria-hidden="true" className="mr-2 size-4" /> Generate slip
          </Button>
        )}
      </div>

      <Card className="min-w-0 overflow-hidden rounded-xl border">
        <div className="divide-y lg:hidden">
          {slips.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No salary slips generated yet. Generate a slip to see it here.
            </p>
          ) : slipsByYear.map((yearGroup) => (
            <details key={yearGroup.year} className="group border-b last:border-b-0">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <FolderIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span>{yearGroup.year}</span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {yearGroup.months.reduce((count, month) => count + month.slips.length, 0)} slips
                </span>
              </summary>
              <div className="border-t">
                {yearGroup.months.map((monthGroup) => (
                  <details key={`${yearGroup.year}-${monthGroup.month}`} className="group/month border-b last:border-b-0">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 bg-muted/20 py-2.5 pl-8 pr-4 text-sm text-foreground outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <FolderIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span>{getMonthName(monthGroup.month)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {monthGroup.slips.length} {monthGroup.slips.length === 1 ? "slip" : "slips"}
                      </span>
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
          {slips.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No salary slips generated yet. Generate a slip to see it here.
            </p>
          ) : slipsByYear.map((yearGroup) => (
            <details key={yearGroup.year} className="group border-b last:border-b-0">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <FolderIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                <span>{yearGroup.year}</span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {yearGroup.months.reduce((count, month) => count + month.slips.length, 0)} slips
                </span>
              </summary>
              <div className="border-t">
                {yearGroup.months.map((monthGroup) => (
                  <details key={`${yearGroup.year}-${monthGroup.month}`} className="group/month border-b last:border-b-0">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 bg-muted/20 py-2.5 pl-8 pr-4 text-sm text-foreground outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <FolderIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span>{getMonthName(monthGroup.month)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {monthGroup.slips.length} {monthGroup.slips.length === 1 ? "slip" : "slips"}
                      </span>
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
          }}
          onSuccess={handleAdjustmentsSuccess}
        />
      )}
    </div>
  );
}
