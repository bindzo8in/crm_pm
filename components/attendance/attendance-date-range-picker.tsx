"use client";

import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

export function AttendanceDateRangePicker({
  startDate,
  endDate,
  onChange,
  onClear,
}: {
  startDate: string;
  endDate: string;
  onChange: (range: DateRange | undefined) => void;
  onClear?: () => void;
}) {
  return (
    <DateRangePicker
      startDate={startDate}
      endDate={endDate}
      onChange={onChange}
      onClear={onClear}
      ariaLabel="Choose attendance date range"
    />
  );
}
