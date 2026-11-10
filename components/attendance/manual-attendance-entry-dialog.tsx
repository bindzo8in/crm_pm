"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createManualAttendanceAction,
  getAttendanceEntryEmployeesAction,
} from "@/actions/attendance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkMode } from "@/app/generated/prisma/enums";
import { dateTimeLocalToUTC, utcToDateTimeLocal } from "@/lib/date";
import {
  Building2Icon,
  CheckIcon,
  ChevronsUpDownIcon,
  LoaderCircleIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ManualAttendanceEntryDialogProps {
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

type AttendanceEntryEmployee = {
  id: string;
  name: string;
  email: string;
  employeeId: number | null;
  department: string | null;
  additionalDepartments: string[];
  workMode: WorkMode;
};

function getCurrentDateTimeLocal() {
  return utcToDateTimeLocal(new Date());
}

export function ManualAttendanceEntryDialog({
  onSuccess,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ManualAttendanceEntryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const [employees, setEmployees] = useState<AttendanceEntryEmployee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [clockIn, setClockIn] = useState(getCurrentDateTimeLocal);
  const [clockOut, setClockOut] = useState("");
  const [status, setStatus] = useState<"PRESENT" | "LATE" | "HALF_DAY">("PRESENT");
  const [workMode, setWorkMode] = useState<WorkMode>(WorkMode.OFFICE);
  const [reason, setReason] = useState("");

  const filteredEmployees = employees.filter((employee) =>
    [
      employee.name,
      employee.email,
      employee.department ?? "",
      ...employee.additionalDepartments,
      employee.employeeId?.toString() ?? "",
    ]
      .some((value) => value.toLocaleLowerCase().includes(employeeSearch.trim().toLocaleLowerCase())),
  );
  const selectedEmployee = employees.find((employee) => employee.id === userId);

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    setEmployeesError("");
    try {
      const result = await getAttendanceEntryEmployeesAction();
      if (!result.success) {
        const message = result.error || "Failed to load employees.";
        setEmployeesError(message);
        toast.error(message);
        setEmployees([]);
        return;
      }
      setEmployees(result.employees);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load employees.";
      setEmployeesError(message);
      toast.error(message);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load employee options when an external action opens this dialog.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) void loadEmployees();
  }, [loadEmployees, open]);

  const openDialog = () => setOpen(true);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const result = await createManualAttendanceAction({
        userId,
        clockIn: dateTimeLocalToUTC(clockIn).toISOString(),
        clockOut: clockOut ? dateTimeLocalToUTC(clockOut).toISOString() : null,
        status,
        workMode,
        reason,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to create attendance entry.");
        return;
      }

      toast.success("Attendance entry created.");
      onSuccess();
      setOpen(false);
      setUserId("");
      setClockIn(getCurrentDateTimeLocal());
      setClockOut("");
      setStatus("PRESENT");
      setWorkMode(WorkMode.OFFICE);
      setReason("");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create attendance entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!hideTrigger && (
        <Button
          size="sm"
          onClick={openDialog}
          className="rounded-xl text-xs font-semibold shadow-sm"
        >
          <PlusIcon className="mr-1 size-3.5" />
          Add entry
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2Icon className="size-5 text-primary" />
            Add attendance entry
          </DialogTitle>
          <DialogDescription>
            Add a record for an employee. The date and time are interpreted in IST and saved to the audit trail.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manual-attendance-employee">Employee</Label>
            <Popover
              open={employeePickerOpen}
              onOpenChange={(isOpen) => {
                setEmployeePickerOpen(isOpen);
                if (!isOpen) setEmployeeSearch("");
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="manual-attendance-employee"
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeePickerOpen}
                  aria-required="true"
                  disabled={employeesLoading || employees.length === 0}
                  className="w-full justify-between gap-2 text-left font-normal"
                >
                  <span className="truncate">
                    {selectedEmployee
                      ? `${selectedEmployee.name} — ${selectedEmployee.email}${selectedEmployee.department ? ` · ${selectedEmployee.department} (Primary)` : ""}${selectedEmployee.additionalDepartments.length ? ` · ${selectedEmployee.additionalDepartments.join(", ")}` : ""}`
                      : employeesLoading
                        ? "Loading employees..."
                        : "Select an employee"}
                  </span>
                  <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] gap-2 p-2"
              >
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder="Search name, email, or department"
                    aria-label="Search employees"
                    className="h-9 pl-8 text-sm"
                  />
                </div>
                <div
                  role="listbox"
                  aria-label="Employees"
                  className="max-h-56 space-y-1 overflow-y-auto"
                >
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        role="option"
                        aria-selected={userId === employee.id}
                        onClick={() => {
                          setUserId(employee.id);
                          setWorkMode(employee.workMode);
                          setEmployeePickerOpen(false);
                          setEmployeeSearch("");
                        }}
                        className={`flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent ${
                          userId === employee.id ? "bg-accent text-accent-foreground" : ""
                        }`}
                      >
                        <CheckIcon className={`size-4 shrink-0 ${userId === employee.id ? "opacity-100" : "opacity-0"}`} />
                        <span className="min-w-0 truncate">
                          {employee.name} — {employee.email}
                          {employee.department ? ` · ${employee.department} (Primary)` : ""}
                          {employee.additionalDepartments.length
                            ? ` · ${employee.additionalDepartments.join(", ")}`
                            : ""}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2.5 py-3 text-center text-sm text-muted-foreground">
                      No employees match your search.
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {!employeesLoading && employeesError && (
              <p className="text-xs text-destructive">{employeesError}</p>
            )}
            {!employeesLoading && !employeesError && employees.length === 0 && (
              <p className="text-xs text-muted-foreground">No active employees are available.</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="manual-attendance-clock-in">Clock in (IST)</Label>
              <Input
                id="manual-attendance-clock-in"
                type="datetime-local"
                value={clockIn}
                onChange={(event) => setClockIn(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-attendance-clock-out">Clock out (optional)</Label>
              <Input
                id="manual-attendance-clock-out"
                type="datetime-local"
                value={clockOut}
                onChange={(event) => setClockOut(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (value === "PRESENT" || value === "LATE" || value === "HALF_DAY") {
                    setStatus(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="LATE">Late</SelectItem>
                  <SelectItem value="HALF_DAY">Half day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Work mode</Label>
              <Select
                value={workMode}
                onValueChange={(value) => {
                  if (
                    value === WorkMode.OFFICE ||
                    value === WorkMode.REMOTE ||
                    value === WorkMode.HYBRID
                  ) {
                    setWorkMode(value);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFICE">Office</SelectItem>
                  <SelectItem value="REMOTE">Remote</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-attendance-reason">Reason for adding this entry</Label>
            <Textarea
              id="manual-attendance-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this attendance record is being added."
              maxLength={500}
              minLength={5}
              required
              className="min-h-20"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || employeesLoading || employees.length === 0 || !userId}>
              {submitting ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              {submitting ? "Saving..." : "Create entry"}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
