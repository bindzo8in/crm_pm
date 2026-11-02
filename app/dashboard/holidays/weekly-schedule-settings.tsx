"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { updateWeekendDaysAction } from "@/actions/holiday";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_WEEKEND_DAYS } from "@/lib/weekend-policy";
import { WEEKDAYS } from "@/lib/weekdays";

export function WeeklyScheduleSettings({
  isManager,
  weekendDays,
}: {
  isManager: boolean;
  weekendDays: number[];
}) {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>(
    weekendDays.length > 0 ? weekendDays : [...DEFAULT_WEEKEND_DAYS],
  );
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges =
    selectedDays.length !== weekendDays.length ||
    selectedDays.some((day, index) => day !== weekendDays[index]);

  function toggleDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right),
    );
  }

  async function saveSchedule() {
    setIsSaving(true);
    try {
      const result = await updateWeekendDaysAction(selectedDays);
      setSelectedDays(result.weekendDays);
      toast.success("Weekly schedule saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the weekly schedule.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="weekly-schedule-title"
      className="rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays aria-hidden="true" className="size-4" />
          </span>
          <div>
            <h3 id="weekly-schedule-title" className="text-sm font-semibold">
              Weekly work schedule
            </h3>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {isManager
                ? "Choose which days are weekends. New leave calculations and attendance reports use this schedule."
                : "The weekly schedule determines non-working days for attendance reports and leave requests."}
            </p>
          </div>
        </div>
        {isManager && (
          <Button
            type="button"
            size="sm"
            onClick={() => void saveSchedule()}
            disabled={!hasChanges || isSaving || selectedDays.length === 0 || selectedDays.length === 7}
          >
            {isSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Save schedule
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {WEEKDAYS.map(({ day, shortLabel, label }) => {
          const isWeekend = selectedDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isWeekend}
              aria-label={`${label}, ${isWeekend ? "weekend" : "working day"}`}
              disabled={!isManager || isSaving}
              onClick={() => toggleDay(day)}
              className={cn(
                "flex min-h-16 flex-col items-start justify-center rounded-lg border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                isWeekend
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background hover:bg-muted/50",
              )}
            >
              <span className="text-sm font-semibold">{shortLabel}</span>
              <span className="mt-1 text-xs text-muted-foreground">
                {isWeekend ? "Weekend" : "Working day"}
              </span>
            </button>
          );
        })}
      </div>
      {(selectedDays.length === 0 || selectedDays.length === 7) && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          Choose at least one weekend day and keep one working day.
        </p>
      )}
      {isManager && (
        <p className="mt-3 text-xs text-muted-foreground">
          Previously submitted leave requests keep their saved day totals.
        </p>
      )}
    </section>
  );
}
