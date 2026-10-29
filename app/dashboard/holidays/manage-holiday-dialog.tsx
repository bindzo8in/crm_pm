"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import type { Holiday } from "@/app/generated/prisma/client";
import {
  createHolidayAction,
  deleteHolidayAction,
  updateHolidayAction,
} from "@/actions/holiday";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatInIST } from "@/lib/date";

const holidayFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a holiday name.").max(120),
  date: z.iso.date("Choose a valid holiday date."),
  description: z.string().trim().max(500),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

export function ManageHolidayDialog({ holiday }: { holiday?: Holiday }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = formatInIST(new Date(), "yyyy-MM-dd");
  const minimumDate = `${today.slice(0, 7)}-01`;
  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: holiday?.name ?? "",
      date: holiday?.date.toISOString().slice(0, 10) ?? today,
      description: holiday?.description ?? "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: HolidayFormValues) =>
      holiday
        ? updateHolidayAction({ ...values, id: holiday.id })
        : createHolidayAction(values),
    onSuccess: () => {
      setError(null);
      toast.success(holiday ? "Holiday updated." : "Holiday added.");
      if (!holiday) {
        form.reset({ name: "", date: today, description: "" });
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
    if (!holiday && values.date < minimumDate) {
      form.setError("date", {
        type: "validate",
        message: "Choose a date in the current month or later.",
      });
      return;
    }
    setError(null);
    saveMutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {holiday ? (
          <Button type="button" variant="outline" size="sm">
            <Pencil aria-hidden="true" className="mr-2 size-4" />
            Edit
          </Button>
        ) : (
          <Button type="button">
            <CalendarPlus aria-hidden="true" className="mr-2 size-4" />
            Add holiday
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{holiday ? "Edit holiday" : "Add company holiday"}</DialogTitle>
          <DialogDescription>
            Holidays apply to all departments. Saved leave day counts will not change when the holiday calendar is edited.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">
            Holiday name
            <Input placeholder="e.g. New Year’s Day" {...form.register("name")} aria-invalid={Boolean(form.formState.errors.name)} />
            {form.formState.errors.name && (
              <span className="block text-xs text-destructive">{form.formState.errors.name.message}</span>
            )}
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Date
            <Input
              type="date"
              min={holiday ? undefined : minimumDate}
              {...form.register("date")}
              aria-invalid={Boolean(form.formState.errors.date)}
            />
            {form.formState.errors.date && (
              <span className="block text-xs text-destructive">{form.formState.errors.date.message}</span>
            )}
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Description (optional)
            <Textarea rows={3} maxLength={500} {...form.register("description")} />
          </label>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Unable to save holiday</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {holiday && (
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMutation.isPending || saveMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Delete ${holiday.name}?`)) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 aria-hidden="true" className="mr-2 size-4" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || deleteMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : holiday ? "Save changes" : "Add holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
