"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Department } from "@/app/generated/prisma/enums";
import { createStaffAccount } from "@/actions/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  name: z.string().trim().min(1, "Enter the staff member's name.").max(120),
  email: z.email("Enter a valid email address.").max(254),
  department: z.enum(Department, {
    error: "Select a department.",
  }),
});

type FormValues = z.infer<typeof schema>;

const departments = Object.values(Department);

export function CreateStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      department: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: createStaffAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      form.reset();
      setError(null);
      onOpenChange(false);
      toast.success("Staff account created. Setup emails were sent.");
    },
    onError: async (cause: Error) => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setError(cause.message || "The staff account could not be created.");
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
      if (!mutation.isPending) form.reset();
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = (values: FormValues) => {
    setError(null);
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Staff account needs attention</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogHeader>
          <DialogTitle>Create staff account</DialogTitle>
          <DialogDescription>
            The staff member will receive one email to verify their address and
            set a password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field data-invalid={Boolean(form.formState.errors.name)}>
            <FieldLabel htmlFor="staff-name">Name</FieldLabel>
            <FieldContent>
              <Input
                id="staff-name"
                autoComplete="name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              <FieldError
                errors={form.formState.errors.name ? [form.formState.errors.name] : []}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.email)}>
            <FieldLabel htmlFor="staff-email">Email</FieldLabel>
            <FieldContent>
              <Input
                id="staff-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register("email")}
              />
              <FieldError
                errors={form.formState.errors.email ? [form.formState.errors.email] : []}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.department)}>
            <FieldLabel htmlFor="staff-department">Department</FieldLabel>
            <FieldContent>
              <Controller
                control={form.control}
                name="department"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="staff-department"
                      aria-invalid={Boolean(form.formState.errors.department)}
                      className="w-full"
                    >
                      <SelectValue placeholder="Choose a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department} value={department}>
                          {department === Department.HR ||
                          department === Department.SEO
                            ? department
                            : department.charAt(0) +
                              department.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError
                errors={
                  form.formState.errors.department
                    ? [form.formState.errors.department]
                    : []
                }
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="staff-role">Role</FieldLabel>
            <FieldContent>
              <Input id="staff-role" value="Staff" readOnly />
              <FieldDescription>
                New accounts cannot be created with Admin or Super Admin access.
              </FieldDescription>
            </FieldContent>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating account..." : "Create staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
