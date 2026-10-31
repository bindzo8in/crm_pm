"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { Department, HolidayCategory } from "@/app/generated/prisma/enums";
import {
  createHolidayAction,
  deleteHolidayAction,
  updateHolidayAction,
} from "@/actions/holiday";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatInIST } from "@/lib/date";
import {
  formatHolidayDateRange,
  HOLIDAY_CATEGORY_LABELS,
  HOLIDAY_DEPARTMENTS,
} from "@/lib/holiday-format";

const holidayFormSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a holiday name.").max(120),
    startDate: z.iso.date("Choose a valid start date."),
    endDate: z.iso.date("Choose a valid end date."),
    category: z.enum([
      "MANDATORY_GAZETTED",
      "RESTRICTED_OPTIONAL",
      "COMPANY_SPECIAL",
    ]),
    departments: z.array(
      z.enum([
        "SALES",
        "DEVELOPMENT",
        "DESIGN",
        "SEO",
        "MARKETING",
        "HR",
        "OPERATIONS",
      ]),
    ),
    notifyStaff: z.boolean(),
    description: z.string().trim().max(500),
  })
  .refine((values) => values.endDate >= values.startDate, {
    path: ["endDate"],
    message: "End date cannot be before start date.",
  })
  .refine(
    (values) =>
      (Date.parse(`${values.endDate}T00:00:00Z`) -
        Date.parse(`${values.startDate}T00:00:00Z`)) /
        86_400_000 <=
      365,
    {
      path: ["endDate"],
      message: "A holiday range cannot exceed 366 days.",
    },
  );

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

export type HolidayFormRecord = {
  id: string;
  name: string;
  dates: Date[];
  category: HolidayCategory;
  departments: Department[];
  notifyStaff: boolean;
  description: string | null;
};

const categories: {
  value: HolidayCategory;
  description: string;
}[] = [
  {
    value: "MANDATORY_GAZETTED",
    description: "Official public holidays observed by the company.",
  },
  {
    value: "RESTRICTED_OPTIONAL",
    description: "Optional or restricted holidays for eligible teams.",
  },
  {
    value: "COMPANY_SPECIAL",
    description: "Additional dates set by the company.",
  },
];

export function ManageHolidayDialog({
  holiday,
  children,
}: {
  holiday?: HolidayFormRecord;
  children?: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = formatInIST(new Date(), "yyyy-MM-dd");
  const minimumDate = `${today.slice(0, 7)}-01`;
  const sortedDates = holiday?.dates
    .map((date) => date.toISOString().slice(0, 10))
    .sort();
  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: holiday?.name ?? "",
      startDate: sortedDates?.[0] ?? today,
      endDate: sortedDates?.at(-1) ?? today,
      category: holiday?.category ?? "MANDATORY_GAZETTED",
      departments: holiday?.departments ?? [],
      notifyStaff: holiday?.notifyStaff ?? true,
      description: holiday?.description ?? "",
    },
  });
  const selectedDepartments = useWatch({
    control: form.control,
    name: "departments",
  });
  const startDate = useWatch({ control: form.control, name: "startDate" });
  const allDepartments = selectedDepartments.length === 0;
  const allDepartmentsSelected =
    allDepartments || selectedDepartments.length === HOLIDAY_DEPARTMENTS.length;

  const saveMutation = useMutation({
    mutationFn: (values: HolidayFormValues) =>
      holiday
        ? updateHolidayAction({ ...values, id: holiday.id })
        : createHolidayAction(values),
    onSuccess: (result) => {
      setError(null);
      if (result.failed > 0) {
        toast.warning(
          `Holiday saved and in-app alerts created, but ${result.failed} email${result.failed === 1 ? "" : "s"} could not be sent.`,
        );
      } else if (result.notificationCount > 0) {
        toast.success(
          `${holiday ? "Holiday updated" : "Holiday added"} and ${result.notificationCount} staff member${result.notificationCount === 1 ? " notified" : "s notified"}.`,
        );
      } else {
        toast.success(holiday ? "Holiday updated." : "Holiday added.");
      }
      void queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      if (!holiday) {
        form.reset({
          name: "",
          startDate: today,
          endDate: today,
          category: "MANDATORY_GAZETTED",
          departments: [],
          notifyStaff: true,
          description: "",
        });
      }
      setOpen(false);
      router.refresh();
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || "Unable to save this holiday.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHolidayAction({ id: holiday?.id ?? "" }),
    onSuccess: () => {
      setError(null);
      toast.success("Holiday deleted.");
      setOpen(false);
      router.refresh();
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message || "Unable to delete this holiday.");
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (!holiday && values.startDate < minimumDate) {
      form.setError("startDate", {
        type: "validate",
        message: "Choose a start date in the current month or later.",
      });
      return;
    }
    setError(null);
    saveMutation.mutate(values);
  });

  function toggleDepartment(department: Department, checked: boolean) {
    const currentDepartments = selectedDepartments;
    const nextDepartments = checked
      ? [...currentDepartments, department]
      : currentDepartments.filter((value) => value !== department);
    form.setValue(
      "departments",
      nextDepartments.length === HOLIDAY_DEPARTMENTS.length
        ? []
        : nextDepartments,
      { shouldDirty: true, shouldValidate: true },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (holiday ? (
          <Button type="button" variant="outline" size="sm">
            <Pencil aria-hidden="true" className="mr-2 size-4" />
            Edit
          </Button>
        ) : (
          <Button type="button">
            <CalendarPlus aria-hidden="true" className="mr-2 size-4" />
            Add holiday
          </Button>
        ))}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{holiday ? "Edit holiday" : "Add a holiday"}</DialogTitle>
          <DialogDescription>
            Choose the dates and teams this holiday applies to. Every date in the range is excluded from applicable leave calculations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium sm:col-span-2">
              Holiday name
              <Input
                placeholder="e.g. New Year’s Day"
                {...form.register("name")}
                aria-invalid={Boolean(form.formState.errors.name)}
              />
              {form.formState.errors.name && (
                <span className="block text-xs text-destructive">
                  {form.formState.errors.name.message}
                </span>
              )}
            </label>

            <label className="block space-y-2 text-sm font-medium">
              Start date
              <Input
                type="date"
                min={holiday ? undefined : minimumDate}
                {...form.register("startDate", {
                  onChange: (event) => {
                    if (form.getValues("endDate") < event.target.value) {
                      form.setValue("endDate", event.target.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  },
                })}
                aria-invalid={Boolean(form.formState.errors.startDate)}
              />
              {form.formState.errors.startDate && (
                <span className="block text-xs text-destructive">
                  {form.formState.errors.startDate.message}
                </span>
              )}
            </label>

            <label className="block space-y-2 text-sm font-medium">
              End date
              <Input
                type="date"
                min={holiday ? undefined : startDate || minimumDate}
                {...form.register("endDate")}
                aria-invalid={Boolean(form.formState.errors.endDate)}
              />
              {form.formState.errors.endDate && (
                <span className="block text-xs text-destructive">
                  {form.formState.errors.endDate.message}
                </span>
              )}
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Holiday category</legend>
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-label="Holiday category"
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {categories.map((category) => {
                    const selected = field.value === category.value;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => field.onChange(category.value)}
                        className={`min-h-24 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {HOLIDAY_CATEGORY_LABELS[category.value]}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {category.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Departments</legend>
            <div className="rounded-lg border p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={allDepartmentsSelected}
                  onCheckedChange={(checked) => {
                    form.setValue(
                      "departments",
                      checked ? [] : HOLIDAY_DEPARTMENTS.map(({ value }) => value),
                      { shouldDirty: true, shouldValidate: true },
                    );
                  }}
                />
                <span>
                  <span className="block text-sm font-medium">All departments</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    The holiday applies across the company.
                  </span>
                </span>
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-3">
                {HOLIDAY_DEPARTMENTS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={allDepartments || selectedDepartments.includes(value)}
                      disabled={allDepartments}
                      onCheckedChange={(checked) =>
                        toggleDepartment(value, checked === true)
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <label className="block space-y-2 text-sm font-medium">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="Add any useful details for staff."
              {...form.register("description")}
            />
          </label>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="notify-holiday-staff">Notify affected staff</Label>
              <p className="text-xs leading-5 text-muted-foreground">
                Send an email and add an in-app notification for each affected staff member.
              </p>
            </div>
            <Controller
              control={form.control}
              name="notifyStaff"
              render={({ field }) => (
                <Switch
                  id="notify-holiday-staff"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Notify affected staff by email and in-app notification"
                />
              )}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to save holiday</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {holiday && (
              <ConfirmDialog
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleteMutation.isPending || saveMutation.isPending}
                  >
                    <Trash2 aria-hidden="true" className="mr-2 size-4" />
                    Delete
                  </Button>
                }
                title="Delete holiday?"
                description={`Delete ${holiday.name} (${formatHolidayDateRange(
                  holiday.dates[0],
                  holiday.dates.at(-1) ?? holiday.dates[0],
                )})? Saved leave day counts will remain unchanged.`}
                confirmLabel="Delete holiday"
                disabled={deleteMutation.isPending || saveMutation.isPending}
                onConfirm={() => deleteMutation.mutate()}
              />
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || deleteMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving…"
                : holiday
                  ? "Save changes"
                  : "Add holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
