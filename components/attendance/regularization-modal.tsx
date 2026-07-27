"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { regularizeAttendanceAction } from "@/actions/attendance";
import { FileEditIcon, RefreshCwIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";

interface RegularizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: any;
  onSuccess: () => void;
}

export function RegularizationModal({ isOpen, onClose, record, onSuccess }: RegularizationModalProps) {
  const [clockIn, setClockIn] = useState<string>(
    record?.clockIn ? new Date(record.clockIn).toISOString().slice(0, 16) : ""
  );
  const [clockOut, setClockOut] = useState<string>(
    record?.clockOut ? new Date(record.clockOut).toISOString().slice(0, 16) : ""
  );
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.length < 5) {
      toast.error("Please provide a clear reason (at least 5 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await regularizeAttendanceAction({
        attendanceRecordId: record.id,
        clockIn,
        clockOut: clockOut || undefined,
        reason,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to submit regularization");
        return;
      }

      toast.success("Attendance regularized successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit regularization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border-border p-6 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileEditIcon className="w-5 h-5 text-primary" /> Regularization Request
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Correct missing or inaccurate check-in/out timestamps with a mandatory reason for audit.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Corrected Clock In</Label>
            <Input
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="rounded-xl text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Corrected Clock Out (Optional)</Label>
            <Input
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Reason for Adjustment</Label>
            <Textarea
              placeholder="e.g. System offline / Forgot check-out / Client visit..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl text-xs min-h-[80px]"
              required
            />
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="w-full rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full rounded-xl font-semibold">
              {loading ? (
                <>
                  <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="w-4 h-4 mr-2" /> Save Adjustment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
