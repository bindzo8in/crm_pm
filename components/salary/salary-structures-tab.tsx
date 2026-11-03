"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SalaryStructureDialog } from "./salary-structure-dialog";
import { EditIcon, Eye, EyeOff, MoreHorizontal, SearchIcon, WalletCardsIcon } from "lucide-react";
import type { SalaryEmployee } from "./types";
import { Input } from "@/components/ui/input";
import { setSalaryPayrollInclusionAction } from "@/actions/salary";

const grossSalaryFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

interface SalaryStructuresTabProps {
  users: SalaryEmployee[];
}

export function SalaryStructuresTab({ users }: SalaryStructuresTabProps) {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<SalaryEmployee | null>(null);
  const [search, setSearch] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const activeUsers = users.filter((user) => user.employmentStatus === "ACTIVE");
  const includedUsers = activeUsers.filter((user) => user.includeInPayroll);
  const excludedUsers = activeUsers.filter((user) => !user.includeInPayroll);
  const rosterUsers = showExcluded ? excludedUsers : includedUsers;
  const filteredUsers = rosterUsers.filter((user) =>
    `${user.name} ${user.email} ${user.department ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch),
  );

  async function togglePayrollInclusion(user: SalaryEmployee) {
    setUpdatingUserId(user.id);
    try {
      const result = await setSalaryPayrollInclusionAction({
        userId: user.id,
        includeInPayroll: !user.includeInPayroll,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error("Failed to update payroll inclusion", error);
      toast.error("Unable to update payroll inclusion.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  function renderActions(user: SalaryEmployee) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10"
            aria-label={`Actions for ${user.name}`}
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setSelectedUser(user)}>
            <EditIcon aria-hidden="true" />
            Edit salary structure
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={updatingUserId === user.id}
            onSelect={() => void togglePayrollInclusion(user)}
          >
            {user.includeInPayroll ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
            {user.includeInPayroll ? "Exclude from payroll" : "Include in payroll"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  function grossSalaryLabel(user: SalaryEmployee) {
    return user.grossSalary === null || user.grossSalary === undefined
      ? "Not configured"
      : grossSalaryFormatter.format(Number(user.grossSalary));
  }

  return (
    <Card className="min-w-0 overflow-hidden rounded-xl border">
      <div className="border-b bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2">
              <WalletCardsIcon aria-hidden="true" className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">Payroll roster</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Only included employees appear in payroll and automatic salary slip generation.
              Excluding someone keeps their past slips.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-1 rounded-lg border bg-background p-1 sm:w-fit">
              <Button
                type="button"
                variant={showExcluded ? "ghost" : "secondary"}
                aria-pressed={!showExcluded}
                onClick={() => setShowExcluded(false)}
              >
                Included ({includedUsers.length})
              </Button>
              <Button
                type="button"
                variant={showExcluded ? "secondary" : "ghost"}
                aria-pressed={showExcluded}
                onClick={() => setShowExcluded(true)}
              >
                Not included ({excludedUsers.length})
              </Button>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                aria-label="Search payroll roster"
                placeholder="Search employees"
                className="h-11 pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 border-b bg-muted/10 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:gap-6 sm:px-5">
        <p>
          <span className="font-medium text-foreground">Gross salary:</span>{" "}
          Monthly earnings before deductions.
        </p>
        <p>
          <span className="font-medium text-foreground">Designation:</span>{" "}
          Optional role context from the employee’s payroll profile; it does not affect pay.
        </p>
      </div>

      <div className="divide-y lg:hidden">
        {filteredUsers.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-medium">No matching employees</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "Try a different name, email, or department." : "Employees will appear here when they are available."}
            </p>
          </div>
        ) : filteredUsers.map((u) => (
          <article key={u.id} className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-medium text-foreground">{u.name}</h3>
                <p className="break-all text-xs text-muted-foreground">{u.email}</p>
              </div>
              {renderActions(u)}
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd><Badge variant="outline" className="text-xs">{u.role}</Badge></dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Designation</dt>
                <dd className="text-sm">{u.designation || "Not assigned"}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd><Badge variant="secondary" className="text-xs">{u.department || "Not assigned"}</Badge></dd>
              </div>
              <div className="col-span-2 space-y-1">
                <dt className="text-xs text-muted-foreground">Payroll</dt>
                <dd className="flex items-center justify-between gap-2">
                  <Badge variant={u.includeInPayroll ? "default" : "secondary"}>
                    {u.includeInPayroll ? "Included" : "Not included"}
                  </Badge>
                </dd>
              </div>
              <div className="col-span-2 space-y-1">
                <dt className="text-xs text-muted-foreground">Gross salary</dt>
                <dd className="font-medium tabular-nums">{grossSalaryLabel(u)}</dd>
                <Badge
                  variant="outline"
                  className={u.hasSalaryStructure
                    ? "mt-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "mt-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"}
                >
                  {u.hasSalaryStructure ? "Configured" : "Not configured"}
                </Badge>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden lg:block">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Account role</TableHead>
            <TableHead className="font-semibold">Designation</TableHead>
            <TableHead className="font-semibold">Department</TableHead>
            <TableHead className="font-semibold">Payroll</TableHead>
            <TableHead className="font-semibold">Gross salary</TableHead>
            <TableHead className="font-semibold text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {search
                  ? "No employees match your search."
                  : showExcluded
                    ? "Everyone is included in payroll."
                    : "No employees are included in payroll yet. Open Not included to add employees."}
              </TableCell>
            </TableRow>
          ) : (
          filteredUsers.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="font-medium text-foreground">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{u.role}</Badge>
                </TableCell>
                <TableCell>{u.designation || "Not assigned"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{u.department || "Not assigned"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.includeInPayroll ? "default" : "secondary"}>
                    {u.includeInPayroll ? "Included" : "Not included"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium tabular-nums">{grossSalaryLabel(u)}</div>
                  <Badge
                    variant="outline"
                    className={u.hasSalaryStructure
                      ? "mt-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "mt-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"}
                  >
                    {u.hasSalaryStructure ? "Configured" : "Not configured"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {renderActions(u)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      {selectedUser && (
        <SalaryStructureDialog 
          isOpen={!!selectedUser} 
          onClose={() => setSelectedUser(null)} 
          user={selectedUser} 
        />
      )}
    </Card>
  );
}
