"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarOff, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { updateWeekendDaysAction } from "@/actions/holiday";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WEEKDAYS } from "@/lib/weekdays";

export function WeeklyScheduleSettings({
  isManager,
  weekendDays,
}: {
  isManager: boolean;
  weekendDays: number[];
}) {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>(weekendDays);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges =
    selectedDays.length !== weekendDays.length ||
    selectedDays.some((day, index) => day !== weekendDays[index]);
  const selectedLabels = WEEKDAYS
    .filter(({ day }) => selectedDays.includes(day))
    .map(({ label }) => label);

  function toggleDay(day: number) {
    setSelectedDays((current) => {
      const isSelected = current.includes(day);
      if (isSelected && current.length === 1) return current;
      if (!isSelected && current.length === 6) return current;
      return isSelected
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right);
    });
  }

  async function saveSchedule() {
    setIsSaving(true);
    try {
      const result = await updateWeekendDaysAction(selectedDays);
      setSelectedDays(result.weekendDays);
      toast.success("Work schedule saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the work schedule.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="schedule-editor-title"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex flex-col gap-4 border-b p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="schedule-editor-title" className="text-lg font-semibold">
              Which days are non-working?
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
              Select every day the team is normally off. Selected days are
              excluded from new leave calculations and attendance reports.
            </p>
          </div>
          {isManager && (
            <Button
              type="button"
              onClick={() => void saveSchedule()}
              disabled={!hasChanges || isSaving}
              className="w-full sm:w-auto"
            >
              {isSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Save changes
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Schedule legend">
          <span className="inline-flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded border border-primary/40 bg-primary/10 text-primary">
              <CalendarOff aria-hidden="true" className="size-3" />
            </span>
            Selected: non-working day
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded border bg-muted/40 text-muted-foreground">
              <BriefcaseBusiness aria-hidden="true" className="size-3" />
            </span>
            Not selected: working day
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Keep at least one working day and one non-working day in the schedule.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 sm:p-6 lg:grid-cols-7">
        {WEEKDAYS.map(({ day, label }) => {
          const isNonWorking = selectedDays.includes(day);
          const isLastNonWorkingDay = isNonWorking && selectedDays.length === 1;
          const isLastWorkingDay = !isNonWorking && selectedDays.length === 6;
          const disabled =
            !isManager || isSaving || isLastNonWorkingDay || isLastWorkingDay;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isNonWorking}
              aria-label={`${label}: ${isNonWorking ? "non-working day" : "working day"}`}
              disabled={disabled}
              onClick={() => toggleDay(day)}
              className={cn(
                "flex min-h-24 flex-col items-start justify-between rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                isNonWorking
                  ? "border-primary/40 bg-primary/[0.07]"
                  : "bg-background hover:bg-muted/50",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold">{label}</span>
                {isNonWorking ? (
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check aria-hidden="true" className="size-3" />
                  </span>
                ) : (
                  <BriefcaseBusiness aria-hidden="true" className="size-4 text-muted-foreground" />
                )}
              </span>
              <span className={`text-xs ${isNonWorking ? "font-medium text-primary" : "text-muted-foreground"}`}>
                {isNonWorking ? "Non-working" : "Working day"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-4 mb-4 rounded-lg bg-muted/40 px-4 py-3 text-sm sm:mx-6 sm:mb-6">
        <span className="font-medium">Current schedule: </span>
        <span className="text-muted-foreground">
          {selectedLabels.join(", ")} {selectedLabels.length === 1 ? "is" : "are"} non-working.
        </span>
      </div>

      <div className="border-t bg-muted/20 px-4 py-3 sm:px-6">
        <p className="text-xs leading-5 text-muted-foreground">
          Changing the schedule affects future leave calculations. Previously
          submitted leave requests keep their saved day totals.
          {!isManager && " Contact HR or an administrator to request a change."}
        </p>
      </div>
    </section>
  );
}
