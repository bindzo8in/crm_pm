"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalarySlipGenerateDialog } from "./salary-slip-generate-dialog";
import { formatCurrency } from "@/lib/utils";
import { FileTextIcon, PlusIcon, DownloadIcon, EyeIcon } from "lucide-react";
import Link from "next/link";

interface SalarySlipsTabProps {
  users: any[];
  initialSlips: any[];
  isHrOrAdmin: boolean;
  currentUserId: string;
}

export function SalarySlipsTab({ users, initialSlips, isHrOrAdmin, currentUserId }: SalarySlipsTabProps) {
  const [slips, setSlips] = useState<any[]>(initialSlips);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const getMonthName = (m: number) => {
    const d = new Date();
    d.setMonth(m - 1);
    return d.toLocaleString('default', { month: 'short' });
  };

  const handleSuccess = (newSlip: any) => {
    setSlips(prev => [newSlip, ...prev.filter(s => s.id !== newSlip.id)]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Salary Slips</h2>
        {isHrOrAdmin && (
          <Button onClick={() => setIsGenerateOpen(true)} className="rounded-xl shadow-md font-semibold">
            <PlusIcon className="w-4 h-4 mr-2" /> Generate Slip
          </Button>
        )}
      </div>

      <Card className="border border-border/60 shadow-md rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-semibold">Employee</TableHead>
              <TableHead className="font-semibold">Period</TableHead>
              <TableHead className="font-semibold">Attendance</TableHead>
              <TableHead className="font-semibold">Net Payable</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No salary slips generated yet.
                </TableCell>
              </TableRow>
            ) : (
              slips.map((slip) => (
                <TableRow key={slip.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-medium text-foreground">{slip.user?.name}</div>
                    <div className="text-xs text-muted-foreground">{slip.user?.department || "N/A"}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{getMonthName(slip.month)} {slip.year}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>Paid: <span className="font-bold text-foreground">{slip.paidDays}</span> / {slip.totalDays}</div>
                      <div>LOP: <span className="font-bold text-rose-500">{slip.absentDays}</span></div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(slip.netSalary)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={slip.status === 'PAID' ? 'default' : 'secondary'} className="text-[10px]">
                      {slip.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Link href={`/s/${slip.id}`} target="_blank">
                          <EyeIcon className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <a href={`/api/salary/slips/${slip.id}/pdf`} target="_blank" rel="noreferrer">
                          <DownloadIcon className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {isHrOrAdmin && (
        <SalarySlipGenerateDialog 
          isOpen={isGenerateOpen}
          onClose={() => setIsGenerateOpen(false)}
          users={users}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
