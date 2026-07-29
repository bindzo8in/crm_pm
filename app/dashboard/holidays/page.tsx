import { getHolidaysAction } from "@/actions/holiday";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UserRole } from "@/app/generated/prisma/enums";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ManageHolidayDialog } from "./manage-holiday-dialog";
import { redirect } from "next/navigation";

export default async function HolidaysPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) return null;

  const isAdmin = session.user.role === UserRole.SUPER_ADMIN || session.user.role === UserRole.ADMIN;
  
  if (!isAdmin) {
    redirect("/dashboard");
  }

  const res = await getHolidaysAction();
  const holidays = res.success ? res.holidays : [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Holiday Management</h2>
        <ManageHolidayDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company & Public Holidays</CardTitle>
          <CardDescription>
            Manage the list of holidays for the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No holidays defined yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday: any) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">{holiday.name}</TableCell>
                    <TableCell>{format(new Date(holiday.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{holiday.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <ManageHolidayDialog holidayToEdit={holiday} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
