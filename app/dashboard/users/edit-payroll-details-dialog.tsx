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
import { UserWithRole } from "better-auth/plugins/admin";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserPayrollDetails } from "@/actions/user";

const schema = z.object({
  employeeNo: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNo: z.string().optional().nullable(),
  panNo: z.string().optional().nullable(),
  costCenter: z.string().optional().nullable(),
  uanNo: z.string().optional().nullable(),
  pfNo: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

type EditPayrollDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole & { 
    employeeNo?: string | null;
    designation?: string | null;
    bankName?: string | null;
    bankAccountNo?: string | null;
    panNo?: string | null;
    costCenter?: string | null;
    uanNo?: string | null;
    pfNo?: string | null;
  };
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
      employeeNo: user.employeeNo || "",
      designation: user.designation || "",
      bankName: user.bankName || "",
      bankAccountNo: user.bankAccountNo || "",
      panNo: user.panNo || "",
      costCenter: user.costCenter || "",
      uanNo: user.uanNo || "",
      pfNo: user.pfNo || "",
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
    onError: (error: any) => {
      setError(error.message || "Failed to update payroll details");
    },
  });

  const onSubmit = async (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Employee No</FieldLabel>
              <FieldContent>
                <Input {...form.register("employeeNo")} placeholder="e.g. EMP-001" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.employeeNo?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel>Designation</FieldLabel>
              <FieldContent>
                <Input {...form.register("designation")} placeholder="e.g. Software Engineer" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.designation?.message}</FieldError>
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
              <FieldLabel>PAN No</FieldLabel>
              <FieldContent>
                <Input {...form.register("panNo")} placeholder="e.g. ABCDE1234F" />
              </FieldContent>
              <FieldError className="text-destructive text-sm mt-1">{form.formState.errors.panNo?.message}</FieldError>
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
