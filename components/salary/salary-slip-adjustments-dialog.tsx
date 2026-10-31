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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CirclePlusIcon,
  MinusCircleIcon,
  RefreshCwIcon,
  SaveIcon,
  StethoscopeIcon,
} from "lucide-react";
import type { SalarySlipUpdate } from "./types";
import { formatCurrency } from "@/lib/utils";

interface SalarySlipAdjustmentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slip: {
    id: string;
    medicalReimbursement: number;
    extraEarnings: number;
    extraDeductions: number;
    netSalary?: number;
  };
  onSuccess: (slip: SalarySlipUpdate) => void;
}

export function SalarySlipAdjustmentsDialog({
  isOpen,
  onClose,
  slip,
  onSuccess,
}: SalarySlipAdjustmentsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [medicalReimbursement, setMedicalReimbursement] = useState(
    String(slip.medicalReimbursement ?? 0),
  );
  const [extraEarnings, setExtraEarnings] = useState(String(slip.extraEarnings ?? 0));
  const [extraDeductions, setExtraDeductions] = useState(String(slip.extraDeductions ?? 0));
  const asAmount = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
  };
  const addedEarnings =
    asAmount(medicalReimbursement) + asAmount(extraEarnings);
  const currentAdjustmentImpact =
    asAmount(String(slip.medicalReimbursement)) +
    asAmount(String(slip.extraEarnings)) -
    asAmount(String(slip.extraDeductions));
  const netChange =
    addedEarnings -
    asAmount(extraDeductions) -
    currentAdjustmentImpact;
  const projectedNetSalary =
    Number(slip.netSalary ?? 0) + netChange;
  const hasInvalidAmount = [medicalReimbursement, extraEarnings, extraDeductions]
    .some((value) => value.trim() === "" || Number(value) < 0 || !Number.isFinite(Number(value)));

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/salary/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipId: slip.id,
          medicalReimbursement: Number(medicalReimbursement),
          extraEarnings: Number(extraEarnings),
          extraDeductions: Number(extraDeductions),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to update salary adjustments.");
        return;
      }

      toast.success("Salary adjustments updated.");
      onSuccess(result.slip);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update salary adjustments.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg gap-0 rounded-2xl border-border bg-background p-0">
        <DialogHeader>
          <div className="border-b px-5 py-5 pr-14 sm:px-6">
            <DialogTitle className="text-xl">Adjust salary slip</DialogTitle>
            <DialogDescription className="mt-1">
              Add one-time amounts before the slip is marked as paid.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <p className="text-xs font-medium text-muted-foreground">Projected take-home</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(projectedNetSalary)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {netChange === 0
                ? "No adjustment impact"
                : `${netChange > 0 ? "+" : ""}${formatCurrency(netChange)} net change`}
            </p>
          </div>

          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-sm font-semibold">
              <CirclePlusIcon className="size-4 text-emerald-600" />
              Earnings and reimbursements
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="medical-reimbursement">Medical reimbursement</Label>
                <div className="relative">
                  <StethoscopeIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="medical-reimbursement"
                    className="h-11 pl-10"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={medicalReimbursement}
                    onChange={(event) => setMedicalReimbursement(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extra-earnings">Additional earnings</Label>
                <Input
                  id="extra-earnings"
                  className="h-11"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={extraEarnings}
                  onChange={(event) => setExtraEarnings(event.target.value)}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-sm font-semibold">
              <MinusCircleIcon className="size-4 text-rose-600" />
              Deductions
            </legend>
            <div className="space-y-2">
              <Label htmlFor="extra-deductions">Additional deductions</Label>
              <Input
                id="extra-deductions"
                className="h-11"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={extraDeductions}
                onChange={(event) => setExtraDeductions(event.target.value)}
              />
            </div>
          </fieldset>

          {hasInvalidAmount && (
            <p className="text-sm text-destructive" role="alert">
              Enter zero or a positive amount in every adjustment field.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" size="lg" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="lg" onClick={handleSave} disabled={loading || hasInvalidAmount}>
            {loading ? (
              <RefreshCwIcon className="animate-spin" />
            ) : (
              <SaveIcon />
            )}
            Save adjustments
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
