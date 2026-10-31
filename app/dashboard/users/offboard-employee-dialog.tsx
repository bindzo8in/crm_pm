"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { EmploymentStatus } from "@/app/generated/prisma/enums";
import {
  deactivateEmployee,
  getEmployeeOffboardingPreview,
  getEmployeeStatusHistory,
  reactivateEmployee,
} from "@/actions/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { getUsers } from "@/actions/user";

type UserRow = Awaited<ReturnType<typeof getUsers>>["users"][number];

const formSchema = z.object({
  effectiveDate: z.string().min(1, "Choose an effective date."),
  reason: z.string().trim().min(1, "Enter a reason for this status change.").max(1000),
  reassignmentUserId: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function OffboardEmployeeDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow;
}) {
  const [error, setError] = useState<string | null>(null);
  const isActive = user.employmentStatus === EmploymentStatus.ACTIVE;
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      effectiveDate: todayDateValue(),
      reason: "",
      reassignmentUserId: "",
    },
  });
  const preview = useQuery({
    queryKey: ["employee-offboarding-preview", user.id],
    queryFn: () => getEmployeeOffboardingPreview(user.id),
    enabled: open && isActive,
  });
  const statusHistory = useQuery({
    queryKey: ["employee-status-history", user.id],
    queryFn: () => getEmployeeStatusHistory(user.id),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isActive
        ? deactivateEmployee({
            userId: user.id,
            effectiveDate: values.effectiveDate,
            reason: values.reason,
            reassignmentUserId: values.reassignmentUserId || null,
          })
        : reactivateEmployee({
            userId: user.id,
            effectiveDate: values.effectiveDate,
            reason: values.reason,
          }),
    onSuccess: async () => {
      await queryClient.cancelQueries({
        queryKey: ["employee-offboarding-preview", user.id],
      });
      queryClient.removeQueries({
        queryKey: ["employee-offboarding-preview", user.id],
      });
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({
        queryKey: ["employee-status-history", user.id],
      });
      form.reset({
        effectiveDate: todayDateValue(),
        reason: "",
        reassignmentUserId: "",
      });
      setError(null);
      toast.success(
        isActive ? "Employee deactivated." : "Employee reactivated.",
      );
    },
    onError: (cause: Error) => {
      setError(cause.message || "The employment status could not be updated.");
    },
  });

  const work = preview.data?.work;
  const hasWorkToReassign = work
    ? work.customerCount + work.projectCount + work.taskCount + work.memberCount > 0
    : false;
  const noReplacementAvailable =
    hasWorkToReassign &&
    (preview.data?.replacementCandidates.length ?? 0) === 0;

  const onSubmit = (values: FormValues) => {
    setError(null);
    if (mutation.isPending) {
      return;
    }
    if (isActive && hasWorkToReassign && !values.reassignmentUserId) {
      setError("Choose an active employee to receive this employee's work.");
      return;
    }
    mutation.mutate(values);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !mutation.isPending) {
      form.reset({
        effectiveDate: todayDateValue(),
        reason: "",
        reassignmentUserId: "",
      });
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isActive ? "Deactivate employee" : "Reactivate employee"}
          </DialogTitle>
          <DialogDescription>
            {isActive
              ? `Sign-in will be disabled for ${user.name}. Their account and historical records will be retained.`
              : `${user.name} will be able to sign in again. Their prior employment history will remain unchanged.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Status change could not be completed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isActive && preview.isError && (
          <Alert variant="destructive">
            <AlertTitle>Work assignments could not be loaded</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>Reload the employee’s current assignments before continuing.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => preview.refetch()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isActive && preview.isLoading ? (
          <div role="status" className="space-y-3">
            <span className="sr-only">Loading assigned work</span>
            <div className="h-20 animate-pulse rounded-md bg-muted" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isActive && work && (
              <section className="space-y-2 rounded-lg border p-4">
                <h3 className="text-sm font-medium">Current work to hand off</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Customers</dt>
                    <dd className="font-medium">{work.customerCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Projects</dt>
                    <dd className="font-medium">{work.projectCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Open tasks</dt>
                    <dd className="font-medium">{work.taskCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Project teams</dt>
                    <dd className="font-medium">{work.memberCount}</dd>
                  </div>
                </dl>
                <p className="text-sm text-muted-foreground">
                  Completed work and creator history will not be changed.
                </p>
              </section>
            )}

            {isActive && hasWorkToReassign && (
              <Field data-invalid={Boolean(form.formState.errors.reassignmentUserId)}>
                <FieldLabel htmlFor="employee-reassignment">
                  Reassign active work to
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="reassignmentUserId"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        disabled={noReplacementAvailable}
                      >
                        <SelectTrigger
                          id="employee-reassignment"
                          className="w-full"
                          aria-invalid={Boolean(
                            form.formState.errors.reassignmentUserId,
                          )}
                        >
                          <SelectValue placeholder="Choose an active employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {preview.data?.replacementCandidates.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.name} · {candidate.role.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldDescription>
                    Customer assignments, active project ownership, open tasks,
                    and active project memberships will be transferred.
                  </FieldDescription>
                  <FieldError
                    errors={
                      form.formState.errors.reassignmentUserId
                        ? [form.formState.errors.reassignmentUserId]
                        : []
                    }
                  />
                  {noReplacementAvailable && (
                    <p role="alert" className="text-sm text-destructive">
                      No active employee is available for reassignment. Add or
                      reactivate an employee before offboarding this person.
                    </p>
                  )}
                </FieldContent>
              </Field>
            )}

            <Field data-invalid={Boolean(form.formState.errors.effectiveDate)}>
              <FieldLabel htmlFor="employment-effective-date">
                Effective date
              </FieldLabel>
              <FieldContent>
                <Input
                  id="employment-effective-date"
                  type="date"
                  max={todayDateValue()}
                  aria-invalid={Boolean(form.formState.errors.effectiveDate)}
                  {...form.register("effectiveDate")}
                />
                <FieldError
                  errors={
                    form.formState.errors.effectiveDate
                      ? [form.formState.errors.effectiveDate]
                      : []
                  }
                />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.reason)}>
              <FieldLabel htmlFor="employment-status-reason">Reason</FieldLabel>
              <FieldContent>
                <Textarea
                  id="employment-status-reason"
                  maxLength={1000}
                  rows={3}
                  aria-invalid={Boolean(form.formState.errors.reason)}
                  {...form.register("reason")}
                />
                <FieldDescription>
                  This note is recorded in the employee status history.
                </FieldDescription>
                <FieldError
                  errors={
                    form.formState.errors.reason
                      ? [form.formState.errors.reason]
                      : []
                  }
                />
              </FieldContent>
            </Field>

            {!isActive && user.employmentEndedAt && (
              <p className="text-sm text-muted-foreground">
                Inactive since {format(user.employmentEndedAt, "dd/MM/yyyy")}.
              </p>
            )}

            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Employment status history</h3>
              {statusHistory.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  Status history could not be loaded.
                </p>
              ) : statusHistory.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading history…</p>
              ) : statusHistory.data?.length ? (
                <ol className="space-y-3">
                  {statusHistory.data.map((event) => (
                    <li
                      key={event.id}
                      className="space-y-1 rounded-md bg-muted/40 p-3 text-sm"
                    >
                      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                        <span className="font-medium">
                          {event.action === "DEACTIVATED"
                            ? "Deactivated"
                            : "Reactivated"}
                        </span>
                        <span className="text-muted-foreground">
                          Effective {format(event.effectiveAt, "dd/MM/yyyy")}
                        </span>
                      </div>
                      <p>{event.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Recorded by {event.changedBy?.name ?? event.changedBy?.email ?? "Former administrator"}
                        {event.reassignedTo
                          ? ` · Work reassigned to ${event.reassignedTo.name}`
                          : ""}
                        {" · "}
                        {format(event.changedAt, "dd/MM/yyyy HH:mm")}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No employment status changes have been recorded.
                </p>
              )}
            </section>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={isActive ? "destructive" : "default"}
                disabled={
                  mutation.isPending ||
                  (isActive &&
                    (preview.isLoading ||
                      preview.isError ||
                      noReplacementAvailable))
                }
              >
                {mutation.isPending
                  ? "Saving…"
                  : isActive
                    ? "Deactivate employee"
                    : "Reactivate employee"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
