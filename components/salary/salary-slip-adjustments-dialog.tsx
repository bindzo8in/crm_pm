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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CirclePlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import type { SalarySlipAdjustmentRecord, SalarySlipUpdate } from "./types";
import { formatCurrency } from "@/lib/utils";

interface SalarySlipAdjustmentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slip: {
    id: string;
    netSalary: number;
    adjustments: SalarySlipAdjustmentRecord[];
  };
  onSuccess: (slip: SalarySlipUpdate) => void;
}

export function SalarySlipAdjustmentsDialog({
  isOpen,
  onClose,
  slip,
  onSuccess,
}: SalarySlipAdjustmentsDialogProps) {
  const [type, setType] = useState<"EARNING" | "DEDUCTION">("EARNING");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function submitAdjustment() {
    const parsedAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a reason and a positive amount.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/salary/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipId: slip.id,
          type,
          description: description.trim(),
          amount: parsedAmount,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "Could not add the adjustment.");
        return;
      }

      onSuccess(result.slip);
      setDescription("");
      setAmount("");
      toast.success(type === "EARNING" ? "Earning added." : "Deduction added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the adjustment.");
    } finally {
      setLoading(false);
    }
  }

  async function removeAdjustment(adjustmentId: string) {
    setRemovingId(adjustmentId);
    try {
      const response = await fetch("/api/salary/adjustment-remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId: slip.id, adjustmentId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "Could not remove the adjustment.");
        return;
      }
      onSuccess(result.slip);
      toast.success("Adjustment removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the adjustment.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg gap-0 overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="border-b px-5 py-5 pr-14 sm:px-6">
          <DialogTitle className="text-xl">One-time adjustments</DialogTitle>
          <DialogDescription>
            Add an incentive or other earning, or a deduction, for this employee and month.
            Each entry is recorded separately and appears on the slip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Current net pay</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatCurrency(slip.netSalary)}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salary-adjustment-type">Adjustment</Label>
                <Select
                  value={type}
                  onValueChange={(value) =>
                    setType(value === "DEDUCTION" ? "DEDUCTION" : "EARNING")
                  }
                >
                  <SelectTrigger id="salary-adjustment-type" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EARNING">Earning / incentive</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary-adjustment-amount">Amount</Label>
                <Input
                  id="salary-adjustment-amount"
                  className="h-11"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary-adjustment-reason">Reason</Label>
              <Input
                id="salary-adjustment-reason"
                className="h-11"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={120}
                placeholder={type === "EARNING" ? "e.g. November sales incentive" : "e.g. Approved salary correction"}
              />
            </div>
            {type === "DEDUCTION" && (
              <p className="text-xs text-muted-foreground">
                Use deductions only when permitted by your payroll and employment rules.
              </p>
            )}
            <Button onClick={() => void submitAdjustment()} disabled={loading} className="w-full sm:w-auto">
              {loading ? <RefreshCwIcon className="animate-spin" /> : <CirclePlusIcon />}
              Add adjustment
            </Button>
          </div>

          <section aria-labelledby="salary-adjustments-list" className="space-y-3">
            <h3 id="salary-adjustments-list" className="text-sm font-semibold">Added to this slip</h3>
            {slip.adjustments.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                No one-time adjustments. The scheduled salary calculation is unchanged.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {slip.adjustments.map((adjustment) => (
                  <li key={adjustment.id} className="flex items-center gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{adjustment.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {adjustment.type === "EARNING" ? "Earning" : "Deduction"}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-semibold tabular-nums ${adjustment.type === "EARNING" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                      {adjustment.type === "EARNING" ? "+" : "−"}
                      {formatCurrency(Number(adjustment.amount))}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${adjustment.description}`}
                      disabled={removingId === adjustment.id}
                      onClick={() => void removeAdjustment(adjustment.id)}
                    >
                      {removingId === adjustment.id ? (
                        <RefreshCwIcon className="size-4 animate-spin" />
                      ) : (
                        <Trash2Icon className="size-4" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end border-t bg-background px-5 py-4 sm:px-6">
          <Button variant="outline" size="lg" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
