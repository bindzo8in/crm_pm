"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalaryStructureDialog } from "./salary-structure-dialog";
import { EditIcon } from "lucide-react";
import type { SalaryEmployee } from "./types";

interface SalaryStructuresTabProps {
  users: SalaryEmployee[];
}

export function SalaryStructuresTab({ users }: SalaryStructuresTabProps) {
  const [selectedUser, setSelectedUser] = useState<SalaryEmployee | null>(null);

  return (
    <Card className="min-w-0 overflow-hidden rounded-xl border">
      <div className="border-b border-border/60 bg-muted/20 p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Employee salary structures</h2>
        <p className="text-sm text-muted-foreground">Set base salary, allowances, and standard deductions for each employee.</p>
      </div>
      
      <div className="divide-y lg:hidden">
        {users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No employees found.</p>
        ) : users.map((u) => (
          <article key={u.id} className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-medium text-foreground">{u.name}</h3>
                <p className="break-all text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="min-h-10 shrink-0"
                onClick={() => setSelectedUser(u)}
              >
                <EditIcon aria-hidden="true" className="mr-1.5 size-4" />
                Edit
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-3">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Role</dt>
                <dd><Badge variant="outline" className="text-xs">{u.role}</Badge></dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Department</dt>
                <dd><Badge variant="secondary" className="text-xs">{u.department || "Not assigned"}</Badge></dd>
              </div>
              <div className="col-span-2 space-y-1">
                <dt className="text-xs text-muted-foreground">Salary structure</dt>
                <dd>
                  <Badge
                    variant="outline"
                    className={u.hasSalaryStructure
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"}
                  >
                    {u.hasSalaryStructure ? "Configured" : "Not configured"}
                  </Badge>
                </dd>
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
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Department</TableHead>
            <TableHead className="font-semibold">Salary Structure</TableHead>
            <TableHead className="font-semibold text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No employees found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((u) => (
              <TableRow key={u.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="font-medium text-foreground">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{u.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">{u.department || "Not assigned"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={u.hasSalaryStructure
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"}
                  >
                    {u.hasSalaryStructure ? "Configured" : "Not configured"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="min-h-10"
                    onClick={() => setSelectedUser(u)}
                  >
                    <EditIcon aria-hidden="true" className="mr-1.5 size-4" />
                    Edit Structure
                  </Button>
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
