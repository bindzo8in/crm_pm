"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChartPeriod = "last6months" | "thisFiscalYear" | "previousFiscalYear" | "custom";

export function DashboardChartDateFilter({
  period: initialPeriod,
  fromDate: initialFromDate,
  toDate: initialToDate,
}: {
  period: ChartPeriod;
  fromDate: string;
  toDate: string;
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);

  return (
    <form action="/dashboard" method="get" className="flex flex-wrap items-end gap-2">
      <label className="space-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <SlidersHorizontal aria-hidden="true" className="size-3" />
          Date range
        </span>
        <select
          name="period"
          value={period}
          onChange={(event) => setPeriod(event.target.value as ChartPeriod)}
          className="h-9 min-w-44 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="last6months">Last 6 months</option>
          <option value="thisFiscalYear">This financial year</option>
          <option value="previousFiscalYear">Previous financial year</option>
          <option value="custom">Custom date range</option>
        </select>
      </label>
      {period === "custom" && (
        <>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>From</span>
            <Input
              name="fromDate"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              max={toDate || undefined}
              required
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>To</span>
            <Input
              name="toDate"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              min={fromDate || undefined}
              required
            />
          </label>
        </>
      )}
      <Button type="submit" size="sm" variant="outline">Apply</Button>
    </form>
  );
}
