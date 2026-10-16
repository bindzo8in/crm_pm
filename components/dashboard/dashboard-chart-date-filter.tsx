"use client";

import { useState } from "react";

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
      <label>
        <select
          name="period"
          value={period}
          onChange={(event) => {
            const nextPeriod = event.target.value as ChartPeriod;
            setPeriod(nextPeriod);
            if (nextPeriod !== "custom") event.currentTarget.form?.requestSubmit();
          }}
          aria-label="Chart date range"
          className="h-8 min-w-0 rounded-md border-0 bg-transparent px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="last6months">Last 6 Months</option>
          <option value="thisFiscalYear">This Fiscal Year</option>
          <option value="previousFiscalYear">Previous Fiscal Year</option>
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
      {period === "custom" && (
        <Button type="submit" size="sm" variant="outline">Apply</Button>
      )}
    </form>
  );
}
