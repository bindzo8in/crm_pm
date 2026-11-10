"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { searchSalaryEmployeesAction } from "@/actions/salary";
import {
  CalendarDaysIcon,
  CalculatorIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { SalaryEmployee, SalarySlipRecord } from "./types";

interface SalarySlipGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slip: SalarySlipRecord) => void;
}

export function SalarySlipGenerateDialog({
  isOpen,
  onClose,
  onSuccess,
}: SalarySlipGenerateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employees, setEmployees] = useState<
    Array<Pick<SalaryEmployee, "id" | "name" | "email" | "department">>
  >([]);
  const [selectedEmployee, setSelectedEmployee] = useState<
    Pick<SalaryEmployee, "id" | "name" | "email" | "department"> | null
  >(null);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  
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

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setEmployeesLoading(true);
      setEmployeesError(null);
      try {
        const result = await searchSalaryEmployeesAction({ search: employeeSearch });
        if (!result.success) throw new Error(result.error);
        if (active) setEmployees(result.employees);
      } catch (error) {
        if (active) {
          setEmployeesError(
            error instanceof Error ? error.message : "Could not load employees.",
          );
        }
      } finally {
        if (active) setEmployeesLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [employeeSearch, isOpen]);

  const handleGenerate = async () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedEmployee.id,
          month: Number(month),
          year: Number(year),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Salary slip generated successfully.");
        // Add user info back to slip object for UI
        const generatedSlip = data.slip;
        generatedSlip.user = {
          name: selectedEmployee.name,
          email: selectedEmployee.email,
          department: selectedEmployee.department,
        };
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
          <div className="space-y-2">
            <Label htmlFor="salary-slip-employee">Employee</Label>
            <Input
              id="salary-slip-employee"
              value={employeeSearch}
              onChange={(event) => {
                setEmployeeSearch(event.target.value);
                setSelectedEmployee(null);
              }}
              placeholder="Search name, email, or department"
              className="h-11"
            />
            {selectedEmployee && (
              <p className="rounded-md bg-primary/5 px-3 py-2 text-sm">
                Selected: <span className="font-medium">{selectedEmployee.name}</span>
                <span className="text-muted-foreground">
                  {" "}({selectedEmployee.department || selectedEmployee.email})
                </span>
              </p>
            )}
            {employeesLoading ? (
              <p className="text-sm text-muted-foreground">Searching employees…</p>
            ) : employeesError ? (
              <p role="alert" className="text-sm text-destructive">{employeesError}</p>
            ) : employees.length ? (
              <div className="max-h-44 overflow-y-auto rounded-md border">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => setSelectedEmployee(employee)}
                    className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="font-medium">{employee.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {employee.department || employee.email}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payroll employees match this search.
              </p>
            )}
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
            disabled={loading || !selectedEmployee}
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
