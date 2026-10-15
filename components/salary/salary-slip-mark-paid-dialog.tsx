"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCwIcon, SaveIcon } from "lucide-react";
import type { SalarySlipUpdate } from "./types";

interface SalarySlipMarkPaidDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slipId: string;
  onSuccess: (slip: SalarySlipUpdate) => void;
}

export function SalarySlipMarkPaidDialog({ isOpen, onClose, slipId, onSuccess }: SalarySlipMarkPaidDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
    return localToday.toISOString().slice(0, 10);
  });
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salary/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipId,
          paymentDate,
          paymentMethod,
          referenceId: referenceId || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Salary slip marked as paid.");
        onSuccess(data.slip);
        onClose();
      } else {
        toast.error(data.error || "Failed to update slip status");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update slip status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-background border-border p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle>Mark Salary Slip as Paid</DialogTitle>
          <DialogDescription>Record the payment details for this salary slip.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Date</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reference ID</Label>
            <Input type="text" value={referenceId} onChange={e => setReferenceId(e.target.value)} className="rounded-xl" placeholder="e.g. UTR / Transaction No." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes</Label>
            <Input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl" placeholder="Optional notes" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl font-semibold">
              {loading ? <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> : <SaveIcon className="w-4 h-4 mr-2" />}
              Mark Paid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
