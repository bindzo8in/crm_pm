"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LeaveType } from "@/app/generated/prisma/enums";
import { submitLeaveRequestAction } from "@/actions/leave";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import type { LeaveFormValues } from "@/lib/types/leave";

const formSchema = z.object({
  type: z.enum(LeaveType),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  reason: z.string().trim().min(1, "Add a reason for your request.").max(500),
}).refine((values) => values.endDate >= values.startDate, {
  path: ["endDate"],
  message: "End date cannot be before start date.",
});

const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: LeaveType.ANNUAL, label: "Annual (paid)" },
  { value: LeaveType.SICK, label: "Sick (unpaid)" },
  { value: LeaveType.CASUAL, label: "Casual (unpaid)" },
  { value: LeaveType.UNPAID, label: "Unpaid" },
];

export function LeaveRequestForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: LeaveType.ANNUAL,
      startDate: "",
      endDate: "",
      reason: "",
    },
  });
  const mutation = useMutation({
    mutationFn: submitLeaveRequestAction,
    onSuccess: () => {
      setError(null);
      setSubmitted(true);
      form.reset({
        type: LeaveType.ANNUAL,
        startDate: "",
        endDate: "",
        reason: "",
      });
      router.refresh();
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || "Unable to submit your request.");
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setSubmitted(false);
    mutation.mutate(values);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Request not submitted</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {submitted && (
        <Alert>
          <AlertTitle>Request submitted</AlertTitle>
          <AlertDescription>Your request is pending review. It does not reserve the paid Annual Leave allowance.</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">
          Leave type
          <select
            {...form.register("type")}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {leaveTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Start date
          <Input type="date" {...form.register("startDate")} aria-invalid={Boolean(form.formState.errors.startDate)} />
          {form.formState.errors.startDate && (
            <span className="block text-xs text-destructive">{form.formState.errors.startDate.message}</span>
          )}
        </label>
        <label className="space-y-2 text-sm font-medium">
          End date
          <Input type="date" {...form.register("endDate")} aria-invalid={Boolean(form.formState.errors.endDate)} />
          {form.formState.errors.endDate && (
            <span className="block text-xs text-destructive">{form.formState.errors.endDate.message}</span>
          )}
        </label>
      </div>
      <label className="block space-y-2 text-sm font-medium">
        Reason
        <Textarea
          rows={3}
          maxLength={500}
          placeholder="Share a short reason for your request"
          {...form.register("reason")}
          aria-invalid={Boolean(form.formState.errors.reason)}
        />
        {form.formState.errors.reason && (
          <span className="block text-xs text-destructive">{form.formState.errors.reason.message}</span>
        )}
      </label>
      <p className="text-sm text-muted-foreground">
        Annual Leave is the only paid type. It provides up to one day per calendar month, expires at month-end, and does not carry forward. Approval depends on the allowance in the month of the leave day. Saturdays count as working days; Sundays and company holidays do not count as leave days.
      </p>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
