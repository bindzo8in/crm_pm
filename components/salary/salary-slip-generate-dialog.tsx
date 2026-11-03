"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  CalculatorIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { SalaryEmployee, SalarySlipRecord } from "./types";

interface SalarySlipGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: SalaryEmployee[];
  onSuccess: (slip: SalarySlipRecord) => void;
}

export function SalarySlipGenerateDialog({
  isOpen,
  onClose,
  users,
  onSuccess,
}: SalarySlipGenerateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [month, setMonth] = useState<string>(currentMonth.toString());
  const [year, setYear] = useState<string>(currentYear.toString());

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const years = Array.from({ length: 22 }, (_, index) =>
    (currentYear + 1 - index).toString()
  );

  const handleGenerate = async () => {
    if (!userId) {
      toast.error("Please select an employee");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          month: Number(month),
          year: Number(year),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Salary slip generated successfully.");
        // Add user info back to slip object for UI
        const generatedSlip = data.slip;
        const selectedUser = users.find((user) => user.id === userId);
        if (selectedUser) {
          generatedSlip.user = {
            name: selectedUser.name,
            email: selectedUser.email,
            department: selectedUser.department
          };
        }
        onSuccess(generatedSlip);
        onClose();
      } else {
        toast.error(data.error || "Failed to generate slip");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate slip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[min(90dvh,48rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-5 py-5 pr-14 sm:px-7 sm:py-6 sm:pr-16">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalculatorIcon aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="text-lg">Generate salary slip</DialogTitle>
              <DialogDescription>
                Generate the base slip first. Add one-time earnings or deductions with a reason before review and approval.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 px-5 py-5 sm:px-7 sm:py-6">
          <div className="space-y-1.5">
            <Label htmlFor="salary-slip-employee">Employee</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="salary-slip-employee" className="h-11 w-full">
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.department || "No department"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section
            aria-labelledby="salary-period-heading"
            className="space-y-3 rounded-xl border bg-muted/20 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <CalendarDaysIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              <div className="space-y-0.5">
                <h3 id="salary-period-heading" className="text-sm font-semibold">
                  Payroll period
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose the month this salary slip covers.
                </p>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="salary-slip-month">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="salary-slip-month" className="h-11 w-full">
                    <SelectValue placeholder="Choose a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((monthName, index) => (
                      <SelectItem
                        key={monthName}
                        value={(index + 1).toString()}
                      >
                        {monthName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="salary-slip-year">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="salary-slip-year" className="h-11 w-full">
                    <SelectValue placeholder="Choose a year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((yearOption) => (
                      <SelectItem key={yearOption} value={yearOption}>
                        {yearOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="min-h-11 w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !userId}
            className="min-h-11 w-full sm:w-auto"
          >
            {loading ? (
              <RefreshCwIcon
                aria-hidden="true"
                className="mr-2 size-4 animate-spin"
              />
            ) : (
              <CalculatorIcon aria-hidden="true" className="mr-2 size-4" />
            )}
            {loading ? "Generating slip..." : "Generate salary slip"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
