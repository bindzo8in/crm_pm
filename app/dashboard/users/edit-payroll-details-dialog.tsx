"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserPayrollDetails } from "@/actions/user";

const schema = z.object({
  designation: z.string().optional().nullable(),
  dateOfJoining: z.string().optional().nullable(),
  employmentType: z.enum(["PERMANENT", "CONTRACT", "PROBATION", "INTERN"]).optional().nullable(),
  annualCtc: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNo: z.string().optional().nullable(),
  bankIfsc: z.string().optional().nullable(),
  bankAccountType: z.enum(["SAVINGS", "CURRENT"]).optional().nullable(),
  panNo: z.string().optional().nullable(),
  aadhaarNo: z.string().optional().nullable(),
  costCenter: z.string().optional().nullable(),
  uanNo: z.string().optional().nullable(),
  pfNo: z.string().optional().nullable(),
  esiNo: z.string().optional().nullable(),
  pfEligible: z.boolean(),
  esiEligible: z.boolean(),
  taxRegime: z.enum(["OLD", "NEW"]),
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CHEQUE", "CASH", "OTHER"]),
});

type FormValues = z.infer<typeof schema>;

type PayrollUser = {
  id: string;
  name: string;
  designation?: string | null;
  dateOfJoining?: Date | string | null;
  employmentType?: "PERMANENT" | "CONTRACT" | "PROBATION" | "INTERN" | null;
  annualCtc?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  bankAccountType?: "SAVINGS" | "CURRENT" | null;
  panNo?: string | null;
  aadhaarNo?: string | null;
  costCenter?: string | null;
  uanNo?: string | null;
  pfNo?: string | null;
  esiNo?: string | null;
  pfEligible?: boolean;
  esiEligible?: boolean;
  taxRegime?: "OLD" | "NEW";
  paymentMethod?: "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CASH" | "OTHER";
};

type EditPayrollDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PayrollUser;
};

export function EditPayrollDetailsDialog({
  open,
  onOpenChange,
  user,
}: EditPayrollDetailsDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      designation: user.designation || "",
      dateOfJoining: user.dateOfJoining instanceof Date
        ? user.dateOfJoining.toISOString().slice(0, 10)
        : typeof user.dateOfJoining === "string"
          ? user.dateOfJoining.slice(0, 10)
          : "",
      employmentType: user.employmentType || "PERMANENT",
      annualCtc: user.annualCtc || "",
      bankName: user.bankName || "",
      bankAccountNo: user.bankAccountNo || "",
      bankIfsc: user.bankIfsc || "",
      bankAccountType: user.bankAccountType || "SAVINGS",
      panNo: user.panNo || "",
      aadhaarNo: user.aadhaarNo || "",
      costCenter: user.costCenter || "",
      uanNo: user.uanNo || "",
      pfNo: user.pfNo || "",
      esiNo: user.esiNo || "",
      pfEligible: user.pfEligible ?? false,
      esiEligible: user.esiEligible ?? false,
      taxRegime: user.taxRegime || "NEW",
      paymentMethod: user.paymentMethod || "BANK_TRANSFER",
    },
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateUserPayrollDetails(user.id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to update payroll details");
    },
  });

  const onSubmit = async (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Edit Payroll Details</DialogTitle>
          <DialogDescription>
            Update payroll and employment details for {user.name}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">


            <Field>
              <FieldLabel>Designation</FieldLabel>
              <FieldContent>
                <Input {...form.register("designation")} placeholder="e.g. Software Engineer" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.designation?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Date of Joining</FieldLabel>
              <FieldContent><Input type="date" {...form.register("dateOfJoining")} /></FieldContent>
            </Field>

            <Field>
              <FieldLabel>Employment Type</FieldLabel>
              <FieldContent>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...form.register("employmentType")}>
                  <option value="PERMANENT">Permanent</option>
                  <option value="PROBATION">Probation</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERN">Intern</option>
                </select>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Annual CTC</FieldLabel>
              <FieldContent><Input type="number" min="0" step="0.01" {...form.register("annualCtc")} placeholder="e.g. 600000" /></FieldContent>
              <p className="text-xs text-muted-foreground">Offer-level CTC. Monthly salary components are configured separately in Salary Structure.</p>
            </Field>

            <Field>
              <FieldLabel>Bank Name</FieldLabel>
              <FieldContent>
                <Input {...form.register("bankName")} placeholder="e.g. Canara Bank" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.bankName?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Account No</FieldLabel>
              <FieldContent>
                <Input {...form.register("bankAccountNo")} placeholder="e.g. 1100120403" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.bankAccountNo?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>IFSC Code</FieldLabel>
              <FieldContent><Input {...form.register("bankIfsc")} className="uppercase" placeholder="e.g. KARB0000123" /></FieldContent>
              <FieldError>{form.formState.errors.bankIfsc?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Account Type</FieldLabel>
              <FieldContent>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...form.register("bankAccountType")}>
                  <option value="SAVINGS">Savings</option>
                  <option value="CURRENT">Current</option>
                </select>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>PAN No</FieldLabel>
              <FieldContent>
                <Input {...form.register("panNo")} placeholder="e.g. ABCDE1234F" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.panNo?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Aadhaar No</FieldLabel>
              <FieldContent><Input {...form.register("aadhaarNo")} inputMode="numeric" maxLength={12} placeholder="12-digit Aadhaar" /></FieldContent>
              <FieldError>{form.formState.errors.aadhaarNo?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Cost Center</FieldLabel>
              <FieldContent>
                <Input {...form.register("costCenter")} placeholder="e.g. 1169" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.costCenter?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>UAN No</FieldLabel>
              <FieldContent>
                <Input {...form.register("uanNo")} placeholder="e.g. 100029384756" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.uanNo?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>PF No</FieldLabel>
              <FieldContent>
                <Input {...form.register("pfNo")} placeholder="e.g. KA/BN/12345/678" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.pfNo?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>ESI No</FieldLabel>
              <FieldContent><Input {...form.register("esiNo")} placeholder="ESI insurance number" /></FieldContent>
            </Field>

            <Field>
              <FieldLabel>Tax Regime</FieldLabel>
              <FieldContent>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...form.register("taxRegime")}>
                  <option value="NEW">New regime</option>
                  <option value="OLD">Old regime</option>
                </select>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>Payment Method</FieldLabel>
              <FieldContent>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...form.register("paymentMethod")}>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="OTHER">Other</option>
                </select>
              </FieldContent>
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("pfEligible")} onCheckedChange={(checked) => form.setValue("pfEligible", checked === true)} />
              PF eligible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.watch("esiEligible")} onCheckedChange={(checked) => form.setValue("esiEligible", checked === true)} />
              ESI eligible
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save details"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
