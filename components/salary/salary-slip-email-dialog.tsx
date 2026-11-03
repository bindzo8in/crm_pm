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
import { MailIcon, RefreshCwIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SalarySlipUpdate } from "./types";

interface SalarySlipEmailDialogProps {
  slip: {
    id: string;
    name: string;
    email: string;
    month: number;
    year: number;
    netSalary: number;
    emailSentAt?: Date | string | null;
  } | null;
  onClose: () => void;
  onSuccess: (slip: SalarySlipUpdate) => void;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function SalarySlipEmailDialog({
  slip,
  onClose,
  onSuccess,
}: SalarySlipEmailDialogProps) {
  const [loading, setLoading] = useState(false);

  async function sendEmail() {
    if (!slip) return;
    setLoading(true);
    try {
      const response = await fetch("/api/salary/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId: slip.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "Could not email this salary slip.");
        return;
      }
      onSuccess({ id: slip.id, emailSentAt: result.emailSentAt });
      toast.success(`Salary slip emailed to ${slip.email}.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not email this salary slip.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={slip !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md gap-0 rounded-2xl p-0">
        <DialogHeader className="border-b px-5 py-5 pr-14">
          <DialogTitle>{slip?.emailSentAt ? "Resend salary slip" : "Email salary slip"}</DialogTitle>
          <DialogDescription>
            This sends the approved PDF attachment to the employee’s account email.
          </DialogDescription>
        </DialogHeader>
        {slip && (
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">{slip.name}</p>
              <p className="break-all text-sm text-muted-foreground">{slip.email}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Net pay for {monthNames[slip.month - 1]} {slip.year}
              </p>
              <p className="text-xl font-semibold tabular-nums">{formatCurrency(slip.netSalary)}</p>
            </div>
            {slip.emailSentAt && (
              <p className="text-xs text-muted-foreground">
                Last sent {new Date(slip.emailSentAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={() => void sendEmail()} disabled={!slip || loading}>
            {loading ? <RefreshCwIcon className="animate-spin" /> : <MailIcon />}
            {slip?.emailSentAt ? "Send again" : "Send PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
