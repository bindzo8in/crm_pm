"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CalendarDays, CircleDollarSign, Clock3, Info, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { getHolidaysAction } from "@/actions/holiday";
import { submitLeaveRequestAction } from "@/actions/leave";
import { LeaveType } from "@/app/generated/prisma/enums";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateLeaveDayBreakdown,
  parseDateOnly,
  toDateKey,
} from "@/lib/leave-policy";
import type { LeaveFormValues } from "@/lib/types/leave";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const requestSchema = z
  .object({
    type: z.enum(LeaveType),
    startDate: z.string().min(1, "Choose a start date."),
    endDate: z.string().min(1, "Choose an end date."),
    reason: z.string().trim().min(1, "Add a reason for your request.").max(500),
  })
  .refine((value) => value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date cannot be before start date.",
  });

type HolidayRecord = { date: Date | string };

const leaveOptions = [
  { type: LeaveType.ANNUAL, label: "Annual", detail: "Paid leave, subject to monthly allowance.", icon: CircleDollarSign },
  { type: LeaveType.SICK, label: "Sick", detail: "Unpaid leave for illness or recovery.", icon: Info },
  { type: LeaveType.CASUAL, label: "Casual", detail: "Unpaid leave for personal matters.", icon: CalendarDays },
  { type: LeaveType.UNPAID, label: "Unpaid", detail: "Other approved time away.", icon: Clock3 },
] as const;

export function LeaveRequestForm({
  today,
}: {
  today: string;
}) {
  const router = useRouter();
  const [holidaysByYear, setHolidaysByYear] = useState<Record<number, string[]>>({});
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: LeaveType.ANNUAL,
      startDate: "",
      endDate: "",
      reason: "",
    },
  });
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const endDate = useWatch({ control: form.control, name: "endDate" });
  const selectedType = useWatch({ control: form.control, name: "type" });
  const reason = useWatch({ control: form.control, name: "reason" });
  const startDateRegistration = form.register("startDate");
  const endDateRegistration = form.register("endDate");
  const mutation = useMutation({
    mutationFn: (values: LeaveFormValues) => submitLeaveRequestAction(values),
    onSuccess: () => {
      toast.success("Leave request submitted.");
      form.reset({ type: LeaveType.ANNUAL, startDate: "", endDate: "", reason: "" });
      router.refresh();
    },
    onError: (error: Error) => toast.error(error.message || "Unable to submit leave request."),
  });

  const yearsToLoad = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    const firstYear = Number(startDate.slice(0, 4));
    const finalYear = Number(endDate.slice(0, 4));
    if (!Number.isInteger(firstYear) || !Number.isInteger(finalYear) || finalYear - firstYear > 4) return [];
    return Array.from({ length: finalYear - firstYear + 1 }, (_, index) => firstYear + index);
  }, [startDate, endDate]);

  useEffect(() => {
    let active = true;
    const missingYears = yearsToLoad.filter((year) => !(year in holidaysByYear));
    if (missingYears.length === 0) return;

    void Promise.all(
      missingYears.map(async (year) => {
        const result = await getHolidaysAction({ year });
        return [
          year,
          result.holidays.map((holiday: HolidayRecord) =>
            typeof holiday.date === "string"
              ? holiday.date.slice(0, 10)
              : toDateKey(holiday.date),
          ),
        ] as const;
      }),
    )
      .then((entries) => {
        if (active) {
          setHolidayError(null);
          setHolidaysByYear((current) => ({ ...current, ...Object.fromEntries(entries) }));
        }
      })
      .catch((error: unknown) => {
        if (active) setHolidayError(error instanceof Error ? error.message : "Unable to load holiday dates.");
      });

    return () => {
      active = false;
    };
  }, [holidaysByYear, yearsToLoad]);

  const dayBreakdown = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate || yearsToLoad.length === 0) return null;
    if (yearsToLoad.some((year) => !(year in holidaysByYear))) return null;
    try {
      return calculateLeaveDayBreakdown(
        parseDateOnly(startDate),
        parseDateOnly(endDate),
        new Set(yearsToLoad.flatMap((year) => holidaysByYear[year] ?? [])),
      );
    } catch {
      return null;
    }
  }, [endDate, holidaysByYear, startDate, yearsToLoad]);

  return (
    <form
      className="space-y-6"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      noValidate
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Choose a leave type</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {leaveOptions.map((option) => {
            const Icon = option.icon;
            const selected = selectedType === option.type;
            return (
              <label
                key={option.type}
                className={`flex min-h-28 cursor-pointer gap-3 rounded-lg border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring ${
                  selected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  value={option.type}
                  className="sr-only"
                  {...form.register("type")}
                />
                <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.65fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Start date
              <Input
                type="date"
                min={today}
                {...startDateRegistration}
                onChange={(event) => {
                  setHolidayError(null);
                  void startDateRegistration.onChange(event);
                }}
                aria-invalid={Boolean(form.formState.errors.startDate)}
              />
              {form.formState.errors.startDate && (
                <span className="block text-xs font-normal text-destructive">{form.formState.errors.startDate.message}</span>
              )}
            </label>
            <label className="space-y-2 text-sm font-medium">
              End date
              <Input
                type="date"
                min={startDate || today}
                {...endDateRegistration}
                onChange={(event) => {
                  setHolidayError(null);
                  void endDateRegistration.onChange(event);
                }}
                aria-invalid={Boolean(form.formState.errors.endDate)}
              />
              {form.formState.errors.endDate && (
                <span className="block text-xs font-normal text-destructive">{form.formState.errors.endDate.message}</span>
              )}
            </label>
          </div>
          <label className="block space-y-2 text-sm font-medium">
            Reason for leave
            <Textarea
              maxLength={500}
              rows={4}
              placeholder="Share a brief reason for your request"
              {...form.register("reason")}
              aria-invalid={Boolean(form.formState.errors.reason)}
            />
            <span className="block text-xs font-normal text-muted-foreground">
              {reason.length}/500 characters
            </span>
            {form.formState.errors.reason && (
              <span className="block text-xs font-normal text-destructive">{form.formState.errors.reason.message}</span>
            )}
          </label>
        </div>

        <aside className="rounded-lg border bg-muted/20 p-4" aria-live="polite">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays aria-hidden="true" className="size-4 text-primary" />
            Request summary
          </div>
          {dayBreakdown ? (
            <>
              <p className="mt-4 text-3xl font-semibold tabular-nums">{dayBreakdown.netLeaveDays}</p>
              <p className="text-sm text-muted-foreground">chargeable day(s)</p>
              <div className="mt-4 space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between gap-3"><span>Calendar days</span><span className="tabular-nums">{dayBreakdown.totalDays}</span></div>
                <div className="flex justify-between gap-3"><span>Sundays excluded</span><span className="tabular-nums">{dayBreakdown.sundayCount}</span></div>
                <div className="flex justify-between gap-3"><span>Holidays excluded</span><span className="tabular-nums">{dayBreakdown.holidayCount}</span></div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Choose a valid date range to see its estimated chargeable days.
            </p>
          )}
          <p className="mt-4 flex gap-2 border-t pt-3 text-xs leading-5 text-muted-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {selectedType === LeaveType.ANNUAL
              ? "Annual Leave is paid. Monthly allowance is checked when your request is approved."
              : "Sick, Casual, and Unpaid leave are unpaid. Sundays and configured holidays are excluded."}
          </p>
          {yearsToLoad.length > 0 && !dayBreakdown && !holidayError && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
              Loading holiday dates…
            </p>
          )}
          {yearsToLoad.length === 0 && startDate && endDate && (
            <p className="mt-2 text-xs text-muted-foreground">Preview supports ranges up to five calendar years.</p>
          )}
          {holidayError && <p role="alert" className="mt-2 text-xs text-destructive">{holidayError}</p>}
        </aside>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          Requests are reviewed by your leave manager. Overlapping pending or approved leave is not allowed.
        </p>
        <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending}>
          {mutation.isPending && <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />}
          Submit request
        </Button>
      </div>
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{mutation.error.message || "Unable to submit leave request."}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
