"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, UserRound } from "lucide-react";
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Review</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-h-[min(90dvh,52rem)] sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-5 pr-14 sm:px-7">
          <DialogTitle className="text-xl">Review leave request</DialogTitle>
          <DialogDescription>
            Check the details before approving or declining. You cannot review your own request.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          <section className="grid gap-3 sm:grid-cols-2" aria-label="Request details">
            <div className="flex min-w-0 items-start gap-3 rounded-lg border p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserRound aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Employee</p>
                <p className="mt-1 break-words font-medium">{leave.user.name || leave.user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{leave.user.department ?? "No department"}</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-3 rounded-lg border p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CalendarDays aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Leave type</p>
                <p className="mt-1 font-medium">{leave.type}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {leave.type === "ANNUAL" ? "Paid leave" : "Unpaid leave"}
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3" aria-label="Leave duration">
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Requested dates</p>
              <p className="mt-2 text-sm font-medium">{formatDate(leave.startDate)}</p>
              <p className="text-sm text-muted-foreground">to {formatDate(leave.endDate)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 aria-hidden="true" className="size-3.5" />
                Chargeable days
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{leave.netLeaveDays}</p>
              <p className="text-xs text-muted-foreground">
                {leave.sundayCount} Sundays and {leave.holidayCount} holidays excluded
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Employee’s reason</h3>
            <p className="whitespace-pre-wrap break-words rounded-lg border p-4 text-sm leading-6">
              {leave.reason}
            </p>
          </section>

          <label className="block space-y-2 text-sm font-medium">
            Review comment <span className="font-normal text-muted-foreground">(optional)</span>
            <Textarea
              maxLength={1000}
              rows={3}
              placeholder="Add a note for the employee"
              value={managerComment}
              onChange={(event) => setManagerComment(event.target.value)}
            />
          </label>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="border-t bg-background px-5 py-4 sm:px-7">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(LeaveStatus.REJECTED)}
          >
            Decline request
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(LeaveStatus.APPROVED)}
          >
            Approve request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
