"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LeaveStatus } from "@/app/generated/prisma/enums";
import { updateLeaveStatusAction } from "@/actions/leave";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ManagerLeaveRequestRow } from "@/lib/types/leave";

export function LeaveReviewDialog({ leave }: { leave: ManagerLeaveRequestRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [managerComment, setManagerComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (status: typeof LeaveStatus.APPROVED | typeof LeaveStatus.REJECTED) =>
      updateLeaveStatusAction({ id: leave.id, status, managerComment }),
    onSuccess: () => {
      setError(null);
      toast.success(`Leave request ${mutation.variables?.toLowerCase() ?? "updated"}.`);
      setOpen(false);
      setManagerComment("");
      router.refresh();
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || "Unable to review this request.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review leave request</DialogTitle>
          <DialogDescription>
            Any HR staff member, Admin, or Super Admin may review a staff request. You cannot review your own request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2 text-sm">
          <p><strong>Employee:</strong> {leave.user.name || leave.user.email}</p>
          <p><strong>Department:</strong> {leave.user.department ?? "Not assigned"}</p>
          <p><strong>Type:</strong> {leave.type}</p>
          <p><strong>Dates:</strong> {leave.startDate.toISOString().slice(0, 10)} – {leave.endDate.toISOString().slice(0, 10)}</p>
          <p><strong>Chargeable days:</strong> {leave.netLeaveDays}</p>
          <p><strong>Reason:</strong> {leave.reason}</p>
        </div>
        <label className="space-y-2 text-sm font-medium">
          Comment (optional)
          <Textarea
            maxLength={1000}
            value={managerComment}
            onChange={(event) => setManagerComment(event.target.value)}
          />
        </label>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(LeaveStatus.REJECTED)}
          >
            Reject
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(LeaveStatus.APPROVED)}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
