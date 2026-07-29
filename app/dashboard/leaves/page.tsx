import { getAllLeaveRequestsAction, getMyLeaveRequestsAction } from "@/actions/leave";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UserRole } from "@/app/generated/prisma/enums";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ManageLeaveDialog } from "./manage-leave-dialog";

export default async function LeavesPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) return null;

  const isAdmin = session.user.role === UserRole.SUPER_ADMIN || session.user.role === UserRole.ADMIN;
  
  let leaves: any[] = [];
  if (isAdmin) {
    const res = await getAllLeaveRequestsAction();
    if (res.success) leaves = res.leaves;
  } else {
    const res = await getMyLeaveRequestsAction();
    if (res.success) leaves = res.leaves;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? "All Leave Requests" : "My Leave Requests"}</CardTitle>
          <CardDescription>
            {isAdmin ? "Manage and review employee leave requests." : "View the status of your leave requests."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No leave requests found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Employee</TableHead>}
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    {isAdmin && (
                      <TableCell className="font-medium">
                        {leave.user?.name || leave.user?.email || "Unknown"}
                      </TableCell>
                    )}
                    <TableCell><Badge variant="outline">{leave.type}</Badge></TableCell>
                    <TableCell>{format(new Date(leave.startDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{format(new Date(leave.endDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{leave.reason}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          leave.status === 'APPROVED' ? 'default' : 
                          leave.status === 'REJECTED' ? 'destructive' : 'secondary'
                        }
                      >
                        {leave.status}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <ManageLeaveDialog leave={leave} />
                      </TableCell>
                    )}
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
