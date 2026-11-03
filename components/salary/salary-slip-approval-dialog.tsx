"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BadgeCheckIcon, RefreshCwIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SalarySlipAdjustmentRecord, SalarySlipUpdate } from "./types";

interface SalarySlipApprovalDialogProps {
  slip: {
    id: string;
    name: string;
    month: number;
    year: number;
    netSalary: number;
    adjustments: SalarySlipAdjustmentRecord[];
    medicalReimbursement: number;
    extraEarnings: number;
    extraDeductions: number;
  } | null;
  onClose: () => void;
  onSuccess: (slip: SalarySlipUpdate) => void;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SalarySlipApprovalDialog({
  slip,
  onClose,
  onSuccess,
}: SalarySlipApprovalDialogProps) {
  const [loading, setLoading] = useState(false);
  const legacyAdjustments = slip
    ? [
        {
          id: "legacy-medical-reimbursement",
          type: "EARNING" as const,
          description: "Medical reimbursement",
          amount: slip.medicalReimbursement,
        },
        {
          id: "legacy-extra-earnings",
          type: "EARNING" as const,
          description: "Additional earnings",
          amount: slip.extraEarnings,
        },
        {
          id: "legacy-extra-deductions",
          type: "DEDUCTION" as const,
          description: "Additional deductions",
          amount: slip.extraDeductions,
        },
      ].filter((adjustment) => adjustment.amount > 0)
    : [];
  const adjustments = [...(slip?.adjustments ?? []), ...legacyAdjustments];

  async function approveSlip() {
    if (!slip) return;
    setLoading(true);
    try {
      const response = await fetch("/api/salary/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId: slip.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "Could not approve this salary slip.");
        return;
      }
      onSuccess(result.slip);
      toast.success("Salary slip approved. Its amounts are now locked.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve this salary slip.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={slip !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-0 rounded-2xl p-0">
        <DialogHeader className="border-b px-5 py-5 pr-14">
          <DialogTitle>Approve salary slip</DialogTitle>
          <DialogDescription>
            Check the final amount before approving. Approved amounts cannot be adjusted.
          </DialogDescription>
        </DialogHeader>
        {slip && (
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">{slip.name}</p>
              <p className="text-sm text-muted-foreground">
                {monthNames[slip.month - 1]} {slip.year}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">Final net pay</p>
              <p className="text-2xl font-semibold tabular-nums">{formatCurrency(slip.netSalary)}</p>
            </div>
            <section aria-label="One-time adjustments" className="space-y-2">
              <p className="text-sm font-medium">One-time adjustments</p>
              {adjustments.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {adjustments.map((adjustment) => (
                    <li key={adjustment.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0 break-words">
                        {adjustment.description}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({adjustment.type === "EARNING" ? "earning" : "deduction"})
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {adjustment.type === "EARNING" ? "+" : "−"}
                        {formatCurrency(Number(adjustment.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Review again</Button>
          <Button onClick={() => void approveSlip()} disabled={!slip || loading}>
            {loading ? <RefreshCwIcon className="animate-spin" /> : <BadgeCheckIcon />}
            Approve and lock
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
