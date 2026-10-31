"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CircleCheckIcon,
  RefreshCwIcon,
} from "lucide-react";
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
  const [referenceError, setReferenceError] = useState("");

  const handleSave = async () => {
    if (paymentMethod !== "CASH" && referenceId.trim() === "") {
      setReferenceError("Add a transaction or payment reference.");
      return;
    }
    setReferenceError("");
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
      <DialogContent className="max-w-lg gap-0 rounded-2xl border-border bg-background p-0">
        <DialogHeader>
          <div className="border-b px-5 py-5 pr-14 sm:px-6">
            <DialogTitle className="text-xl">Mark salary slip as paid</DialogTitle>
            <DialogDescription className="mt-1">
              Record how and when this payment was completed.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-1.5">
            <Label htmlFor="payment-date">Payment date</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value);
                setReferenceError("");
              }}
            >
              <SelectTrigger className="h-11">
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
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="payment-reference">Payment reference</Label>
              {paymentMethod === "CASH" && (
                <span className="text-xs text-muted-foreground">Optional for cash</span>
              )}
            </div>
            <Input
              id="payment-reference"
              type="text"
              value={referenceId}
              onChange={(event) => {
                setReferenceId(event.target.value);
                setReferenceError("");
              }}
              className="h-11"
              placeholder={
                paymentMethod === "UPI"
                  ? "UPI transaction ID"
                  : paymentMethod === "CHEQUE"
                    ? "Cheque number"
                    : "UTR or transaction number"
              }
              aria-invalid={!!referenceError}
              aria-describedby={referenceError ? "payment-reference-error" : undefined}
            />
            {referenceError && (
              <p id="payment-reference-error" className="text-sm text-destructive" role="alert">
                {referenceError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-notes">Payment notes</Label>
            <Input
              id="payment-notes"
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="h-11"
              placeholder="Optional internal note"
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" size="lg" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="lg" onClick={handleSave} disabled={loading || !paymentDate}>
            {loading ? (
              <RefreshCwIcon className="animate-spin" />
            ) : (
              <CircleCheckIcon />
            )}
            Mark as paid
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
