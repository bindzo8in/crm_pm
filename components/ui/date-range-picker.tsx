"use client";

import { format, isSameDay, parseISO } from "date-fns";
import { CalendarDaysIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { DateRange, DayButton } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function toLocalDate(value: string) {
  return value ? parseISO(value) : undefined;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  onClear,
  minDate,
  ariaLabel = "Choose date range",
  closeOnStart = false,
  label = "Date range",
  ariaInvalid = false,
}: {
  startDate: string;
  endDate: string;
  onChange: (range: DateRange | undefined) => void;
  onClear?: () => void;
  minDate?: Date;
  ariaLabel?: string;
  closeOnStart?: boolean;
  label?: string;
  ariaInvalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [calendarSelection, setCalendarSelection] = useState<DateRange | undefined>();
  const pendingStartRef = useRef<Date | null>(null);
  const clickedDateRef = useRef<Date | null>(null);
  const selected: DateRange | undefined =
    startDate || endDate
      ? { from: toLocalDate(startDate), to: toLocalDate(endDate) }
      : undefined;
  const displayLabel =
    selected?.from && selected.to && isSameDay(selected.from, selected.to)
      ? format(selected.from, "MMM d, yyyy")
      : selected?.from && selected.to
      ? `${format(selected.from, "MMM d, yyyy")} – ${format(selected.to, "MMM d, yyyy")}`
      : selected?.from
        ? `${format(selected.from, "MMM d, yyyy")} – Choose end date`
        : "Choose date range";

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          pendingStartRef.current = null;
          clickedDateRef.current = null;
          if (nextOpen) setCalendarSelection(selected);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            aria-invalid={ariaInvalid}
            className="h-10 w-full justify-start gap-2 rounded-xl text-left font-normal"
          >
            <CalendarDaysIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{displayLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[38rem] gap-3 overflow-y-auto p-2 sm:p-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold">{closeOnStart ? "Choose a date" : "Choose a date range"}</p>
            <p className="text-xs text-muted-foreground">
              {closeOnStart ? "Select one date for your half-day request." : "Select a start date and an end date."}
            </p>
          </div>
          <Calendar
            mode="range"
            selected={calendarSelection}
            defaultMonth={selected?.from}
            disabled={minDate ? { before: minDate } : undefined}
            min={closeOnStart ? 0 : 1}
            components={{
              DayButton: (props: React.ComponentProps<typeof DayButton>) => {
                const { onClick, ...buttonProps } = props;
                return (
                  <CalendarDayButton
                    {...buttonProps}
                    onClick={(event) => {
                      clickedDateRef.current = props.day.date;
                      onClick?.(event);
                    }}
                  />
                );
              },
            }}
            onSelect={(range) => {
              if (closeOnStart && range?.from) {
                const date = clickedDateRef.current ?? range.from;
                clickedDateRef.current = null;
                const singleDateRange = { from: date, to: date };
                setCalendarSelection(singleDateRange);
                onChange(singleDateRange);
                setOpen(false);
                pendingStartRef.current = null;
                return;
              }

              if (pendingStartRef.current) {
                const pendingStart = pendingStartRef.current;
                const clickedDate = clickedDateRef.current ?? range?.to ?? pendingStart;
                const completedRange =
                  range?.from && range.to
                    ? range
                    : clickedDate < pendingStart
                      ? { from: clickedDate, to: pendingStart }
                      : { from: pendingStart, to: clickedDate };
                clickedDateRef.current = null;
                setCalendarSelection(completedRange);
                onChange(completedRange);
                setOpen(false);
                pendingStartRef.current = null;
                return;
              }

              const start = clickedDateRef.current ?? range?.from;
              clickedDateRef.current = null;
              if (!start) {
                onChange(range);
                return;
              }

              pendingStartRef.current = start;
              const startOnlyRange = { from: start, to: undefined };
              setCalendarSelection(startOnlyRange);
              onChange(startOnlyRange);
            }}
            numberOfMonths={closeOnStart ? 1 : 2}
            className="w-full p-1 [--cell-size:--spacing(8)] sm:p-3 sm:[--cell-size:--spacing(9)]"
          />
          {selected && onClear && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setCalendarSelection(undefined);
                onClear();
                setOpen(false);
              }}
            >
              Clear date range
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
