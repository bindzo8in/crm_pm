import Link from "next/link";
import { getHolidaysAction } from "@/actions/holiday";
import { formatInIST } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canManageHolidays, requireLeaveUser } from "@/lib/leave-access";
import { ManageHolidayDialog } from "./manage-holiday-dialog";
import DashboardContainer from "../dashboard-container";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getYear(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{4}$/.test(raw)) return undefined;
  const year = Number(raw);
  return year >= 2000 && year <= 2100 ? year : undefined;
}

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const user = await requireLeaveUser();
  const isManager = canManageHolidays(user);
  const year = getYear((await searchParams).year) ?? Number(formatInIST(new Date(), "yyyy"));
  const { holidays } = await getHolidaysAction({ year });

  return (
    <DashboardContainer title="Holidays">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Company holidays</h2>
          <p className="text-sm text-muted-foreground">
            {isManager
              ? "Manage company-wide holidays for all departments."
              : "View company-wide holidays. Saturdays remain working days unless a holiday is listed."}
          </p>
        </div>
        {isManager && <ManageHolidayDialog />}
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{year} holiday calendar</CardTitle>
            <CardDescription>
              Sundays and listed holidays are excluded from chargeable leave days.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {year > 2000 ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/holidays?year=${year - 1}`}>Previous year</Link>
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled>Previous year</Button>
            )}
            {year < 2100 ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/holidays?year=${year + 1}`}>Next year</Link>
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" disabled>Next year</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center">
              <p className="font-medium">No holidays listed for {year}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isManager
                  ? "Add a company holiday to publish it to staff."
                  : "HR will publish company holidays here when they are available."}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y lg:hidden">
                {holidays.map((holiday) => (
                  <article key={holiday.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{holiday.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{formatDate(holiday.date)}</p>
                      </div>
                      {isManager && <ManageHolidayDialog holiday={holiday} />}
                    </div>
                    <p className="break-words text-sm text-muted-foreground">{holiday.description || "No description"}</p>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Holiday</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    {isManager && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{holiday.name}</TableCell>
                      <TableCell className="min-w-48">{formatDate(holiday.date)}</TableCell>
                      <TableCell className="min-w-48 whitespace-normal">{holiday.description || "—"}</TableCell>
                      {isManager && (
                        <TableCell className="text-right">
                          <ManageHolidayDialog holiday={holiday} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardContainer>
  );
}
