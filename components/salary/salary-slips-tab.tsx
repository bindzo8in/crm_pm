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
import { PlusIcon, DownloadIcon, EyeIcon, DollarSignIcon, PencilIcon } from "lucide-react";
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
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString('default', { month: 'short' });
  };

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
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Period</TableHead>
              <TableHead className="font-semibold">Attendance</TableHead>
              <TableHead className="text-right font-semibold">Net payable</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No salary slips generated yet. Generate a slip to see it here.
                </TableCell>
              </TableRow>
            ) : (
              slips.map((slip) => (
                <TableRow key={slip.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium text-foreground">{slip.user?.name}</div>
                    <div className="text-xs text-muted-foreground">{slip.user?.department || "Not assigned"}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{getMonthName(slip.month)} {slip.year}</span>
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
              ))
            )}
          </TableBody>
        </Table>
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
