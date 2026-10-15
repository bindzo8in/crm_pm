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
import { RefreshCwIcon, SaveIcon } from "lucide-react";
import type { SalarySlipUpdate } from "./types";

interface SalarySlipAdjustmentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slip: {
    id: string;
    medicalReimbursement: number;
    extraEarnings: number;
    extraDeductions: number;
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
      <DialogContent className="max-w-md rounded-3xl border-border bg-background p-6">
        <DialogHeader>
          <DialogTitle>Adjust Salary Slip</DialogTitle>
          <DialogDescription>
            Update one-time earnings or deductions. Paid slips cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="medical-reimbursement">Medical reimbursement</Label>
            <Input
              id="medical-reimbursement"
              type="number"
              min="0"
              step="0.01"
              value={medicalReimbursement}
              onChange={(event) => setMedicalReimbursement(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extra-earnings">Additional earnings</Label>
            <Input
              id="extra-earnings"
              type="number"
              min="0"
              step="0.01"
              value={extraEarnings}
              onChange={(event) => setExtraEarnings(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extra-deductions">Additional deductions</Label>
            <Input
              id="extra-deductions"
              type="number"
              min="0"
              step="0.01"
              value={extraDeductions}
              onChange={(event) => setExtraDeductions(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? (
                <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 h-4 w-4" />
              )}
              Save Adjustments
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
