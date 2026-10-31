"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  List,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import type { Holiday } from "@/app/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ManageHolidayDialog,
  type HolidayFormRecord,
} from "./manage-holiday-dialog";
import {
  formatHolidayDateRange,
  formatHolidayDepartmentScope,
  HOLIDAY_CATEGORY_LABELS,
} from "@/lib/holiday-format";

type HolidayRecord = Pick<
  Holiday,
  | "id"
  | "eventId"
  | "name"
  | "date"
  | "category"
  | "departments"
  | "notifyStaff"
  | "description"
>;
type HolidayFilter = "all" | "upcoming";
type HolidayView = "cards" | "list";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function buildCalendarDays(month: Date): Array<{ date: Date; inMonth: boolean }> {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const startOffset = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, index - startOffset + 1));
    return { date, inMonth: date.getUTCMonth() === monthIndex };
  });
}

function HolidayDateBadge({
  date,
  upcoming,
  compact = false,
}: {
  date: Date;
  upcoming: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-lg bg-primary/5 text-center ${compact ? "w-12 py-2" : "min-h-16 w-14"}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
        {new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(date)}
      </span>
      <span className="text-xl font-semibold leading-6 tabular-nums">{date.getUTCDate().toString().padStart(2, "0")}</span>
      <span className={`text-[10px] leading-4 ${upcoming ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
        {new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(date)}
      </span>
    </div>
  );
}

export function HolidayCalendar({
  year,
  today,
  isManager,
  holidays,
}: {
  year: number;
  today: string;
  isManager: boolean;
  holidays: HolidayRecord[];
}) {
  const [month, setMonth] = useState(() => {
    const currentMonth = Number(today.slice(5, 7)) - 1;
    return new Date(Date.UTC(year, year === Number(today.slice(0, 4)) ? currentMonth : 0, 1));
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HolidayFilter>("all");
  const [view, setView] = useState<HolidayView>("cards");

  const holidayKeys = useMemo(() => new Set(holidays.map(({ date }) => dateKey(date))), [holidays]);
  const events = useMemo(() => {
    const groups = new Map<string, HolidayRecord[]>();
    for (const record of holidays) {
      const key = record.eventId ?? record.id;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    return [...groups.values()]
      .map((records): HolidayFormRecord => ({
        id: records[0].id,
        name: records[0].name,
        dates: records.map(({ date }) => date).sort((a, b) => a.getTime() - b.getTime()),
        category: records[0].category,
        departments: records[0].departments,
        notifyStaff: records[0].notifyStaff,
        description: records[0].description,
      }))
      .sort((a, b) => a.dates[0].getTime() - b.dates[0].getTime());
  }, [holidays]);
  const upcomingEvents = events.filter((event) =>
    event.dates.some((date) => dateKey(date) >= today),
  );
  const nextHoliday = upcomingEvents[0] ?? null;
  const nextHolidayDate = nextHoliday?.dates.find((date) => dateKey(date) >= today);
  const daysUntilNextHoliday = nextHolidayDate
    ? dayDiff(today, dateKey(nextHolidayDate))
    : null;
  const calendarDays = useMemo(() => buildCalendarDays(month), [month]);

  const filteredHolidays = events.filter((holiday) => {
    const matchesSearch = `${holiday.name} ${holiday.description ?? ""} ${HOLIDAY_CATEGORY_LABELS[holiday.category]} ${formatHolidayDepartmentScope(holiday.departments)}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter =
      filter === "all" || holiday.dates.some((date) => dateKey(date) >= today);
    const matchesDate =
      !selectedDate || holiday.dates.some((date) => dateKey(date) === selectedDate);
    return matchesSearch && matchesFilter && matchesDate;
  });

  function changeMonth(direction: -1 | 1) {
    setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + direction, 1)));
    setSelectedDate(null);
  }

  const currentMonthIndex = month.getUTCMonth();
  const currentMonthHolidayCount = holidays.filter(
    (holiday) =>
      holiday.date.getUTCFullYear() === month.getUTCFullYear() &&
      holiday.date.getUTCMonth() === currentMonthIndex,
  ).length;

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>People</span>
            <span aria-hidden="true">/</span>
            <span className="text-primary">Company holidays</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Company holidays</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {isManager
              ? "Plan company-wide holidays and help everyone see what’s coming."
              : "See company-wide holidays. Saturdays remain working days unless listed."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <div className="flex h-11 items-center gap-1 rounded-xl border bg-card p-1">
            {year <= 2000 ? (
              <Button type="button" size="icon-sm" variant="ghost" disabled aria-label="Previous year">
                <ChevronLeft aria-hidden="true" />
              </Button>
            ) : (
              <Button asChild size="icon-sm" variant="ghost" aria-label="Previous year">
                <Link href={`/dashboard/holidays?year=${year - 1}`}>
                  <ChevronLeft aria-hidden="true" />
                </Link>
              </Button>
            )}
            <span className="min-w-16 text-center text-sm font-semibold tabular-nums">{year}</span>
            {year >= 2100 ? (
              <Button type="button" size="icon-sm" variant="ghost" disabled aria-label="Next year">
                <ChevronRight aria-hidden="true" />
              </Button>
            ) : (
              <Button asChild size="icon-sm" variant="ghost" aria-label="Next year">
                <Link href={`/dashboard/holidays?year=${year + 1}`}>
                  <ChevronRight aria-hidden="true" />
                </Link>
              </Button>
            )}
          </div>
          {isManager && (
            <ManageHolidayDialog>
              <Button className="h-11 flex-1 sm:flex-none">
                <Plus aria-hidden="true" />
                Add holiday
              </Button>
            </ManageHolidayDialog>
          )}
        </div>
      </header>

      <section aria-label="Holiday summary" className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
        <Card className="min-w-[220px] flex-1 shadow-none sm:min-w-0">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Scheduled holidays</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">{events.length}</span>
                <span className="text-sm text-muted-foreground">in {year}</span>
              </div>
            </div>
            <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <CalendarDays aria-hidden="true" className="size-5" />
            </span>
          </CardContent>
        </Card>
        <Card className="min-w-[240px] flex-1 shadow-none sm:min-w-0">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Next holiday</p>
              {nextHoliday && nextHolidayDate ? (
                <>
                  <p className="mt-2 truncate text-lg font-semibold">{nextHoliday.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatShortDate(nextHolidayDate)}
                    {daysUntilNextHoliday !== null && ` · ${daysUntilNextHoliday === 0 ? "Today" : `In ${daysUntilNextHoliday} days`}`}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No upcoming holiday scheduled.</p>
              )}
            </div>
            <span className="rounded-lg bg-teal-500/10 p-2.5 text-teal-700 dark:text-teal-300">
              <Clock3 aria-hidden="true" className="size-5" />
            </span>
          </CardContent>
        </Card>
        <Card className="hidden shadow-none xl:block">
          <CardContent className="flex items-start gap-3 p-5">
            <span className="rounded-lg bg-muted p-2.5 text-muted-foreground">
              <Info aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Leave day policy</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Sundays and listed holidays are excluded from chargeable leave days.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-primary/10 bg-primary/[0.04] p-4 xl:hidden">
        <span className="mt-0.5 rounded-md bg-primary/10 p-1.5 text-primary">
          <Info aria-hidden="true" className="size-4" />
        </span>
        <p className="text-sm leading-6 text-muted-foreground">
          Sundays and listed holidays are excluded from chargeable leave days.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(16rem,0.82fr)_minmax(0,2fr)]">
        <Card className="min-w-0 self-start shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <p className="text-xs font-semibold text-primary">Quick glance</p>
              <CardTitle className="mt-1 text-base">{formatMonth(month)}</CardTitle>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Previous month"
                disabled={month.getUTCFullYear() === year && month.getUTCMonth() === 0}
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Next month"
                disabled={month.getUTCFullYear() === year && month.getUTCMonth() === 11}
                onClick={() => changeMonth(1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((day) => (
                <span key={day} className="py-2 text-[11px] font-medium text-muted-foreground">{day}</span>
              ))}
              {calendarDays.map(({ date, inMonth }) => {
                const key = dateKey(date);
                const hasHoliday = holidayKeys.has(key);
                const isSelected = selectedDate === key;
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!inMonth}
                    aria-label={`${formatLongDate(date)}${hasHoliday ? ", holiday" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedDate((current) => current === key ? null : key);
                      setFilter("all");
                    }}
                    className={`relative flex aspect-square min-h-9 flex-col items-center justify-center rounded-lg text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : hasHoliday
                          ? "bg-primary/10 font-semibold text-primary hover:bg-primary/15"
                          : isToday
                            ? "border border-primary/30 font-semibold"
                            : "hover:bg-muted"
                    }`}
                  >
                    {date.getUTCDate()}
                    {hasHoliday && (
                      <span className={`absolute bottom-1 size-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-teal-600 dark:bg-teal-300"}`} />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-teal-600 dark:bg-teal-300" />
                {currentMonthHolidayCount} holiday{currentMonthHolidayCount === 1 ? "" : "s"} this month
              </span>
              {selectedDate && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setSelectedDate(null)}>
                  Clear date
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none">
          <CardHeader className="gap-4 border-b pb-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base">Holiday calendar</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedDate ? formatLongDate(new Date(`${selectedDate}T00:00:00Z`)) : `${events.length} scheduled for ${year}`}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1" aria-label="Filter holidays">
                {([
                  ["all", `All ${events.length}`],
                  ["upcoming", `Upcoming ${upcomingEvents.length}`],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => {
                      setFilter(value);
                      setSelectedDate(null);
                    }}
                    className={`min-h-8 shrink-0 rounded-md px-3 text-xs font-medium transition-colors ${
                      filter === value ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search holiday name or description"
                  aria-label="Search holidays"
                  className="pl-9"
                />
              </label>
              <div className="flex shrink-0 gap-1 rounded-lg bg-muted p-1" aria-label="Holiday view">
                <Button
                  type="button"
                  size="sm"
                  variant={view === "cards" ? "secondary" : "ghost"}
                  aria-pressed={view === "cards"}
                  onClick={() => setView("cards")}
                >
                  <CalendarRange aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Cards</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={view === "list" ? "secondary" : "ghost"}
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <List aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">List</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-4">
            {filteredHolidays.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center">
                <CalendarDays aria-hidden="true" className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-3 font-medium">
                {events.length === 0 ? `No holidays listed for ${year}` : "No matching holidays"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                {events.length === 0
                    ? isManager
                      ? "Add a company holiday to publish it to staff."
                      : "HR will publish company holidays here when they are available."
                    : "Try another search or clear the selected date."}
                </p>
                {selectedDate && (
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setSelectedDate(null)}>
                    Clear selected date
                  </Button>
                )}
              </div>
            ) : (
              <div className={view === "cards" ? "space-y-3" : "divide-y"}>
                {filteredHolidays.map((holiday) => {
                  const firstDate = holiday.dates[0];
                  const lastDate = holiday.dates.at(-1) ?? firstDate;
                  const nextDate = holiday.dates.find((date) => dateKey(date) >= today);
                  const displayDate = nextDate ?? firstDate;
                  const upcoming = nextDate !== undefined;
                  const daysAway = nextDate ? dayDiff(today, dateKey(nextDate)) : null;
                  const dateLabel = formatHolidayDateRange(firstDate, lastDate);
                  const departmentLabel = formatHolidayDepartmentScope(holiday.departments);
                  return view === "cards" ? (
                    <article
                      key={holiday.id}
                      className="flex min-w-0 items-start gap-3 rounded-xl border bg-card p-3 sm:gap-4 sm:p-4"
                    >
                      <HolidayDateBadge date={displayDate} upcoming={upcoming} />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge variant={upcoming ? "secondary" : "outline"} className="font-normal">
                            {upcoming ? "Upcoming" : "Passed"}
                          </Badge>
                          {daysAway !== null && daysAway > 0 && (
                            <span className="text-xs text-teal-700 dark:text-teal-300">In {daysAway} days</span>
                          )}
                          {daysAway === 0 && <span className="text-xs font-medium text-primary">Today</span>}
                          <Badge variant="outline" className="font-normal">
                            {HOLIDAY_CATEGORY_LABELS[holiday.category]}
                          </Badge>
                        </div>
                        <h3 className="break-words font-semibold leading-5">{holiday.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{dateLabel}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{departmentLabel}</p>
                        {holiday.description && (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                      {isManager && (
                        <ManageHolidayDialog holiday={holiday}>
                          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Edit ${holiday.name}`}>
                            <Pencil aria-hidden="true" />
                          </Button>
                        </ManageHolidayDialog>
                      )}
                    </article>
                  ) : (
                    <article key={holiday.id} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
                      <HolidayDateBadge date={displayDate} upcoming={upcoming} compact />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-medium">{holiday.name}</h3>
                          <Badge variant="outline" className="font-normal">
                            {HOLIDAY_CATEGORY_LABELS[holiday.category]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel} · {departmentLabel}</p>
                        {holiday.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{holiday.description}</p>
                        )}
                      </div>
                      <Badge variant={upcoming ? "secondary" : "outline"} className="hidden shrink-0 font-normal sm:inline-flex">
                        {upcoming ? "Upcoming" : "Passed"}
                      </Badge>
                      {isManager && (
                        <ManageHolidayDialog holiday={holiday}>
                          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Edit ${holiday.name}`}>
                            <Pencil aria-hidden="true" />
                          </Button>
                        </ManageHolidayDialog>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
