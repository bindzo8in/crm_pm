"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
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
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        {error && (
          <Alert variant="destructive" className="m-5 mb-0 sm:mx-6 sm:mt-6">
            <AlertTitle>Staff account needs attention</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-4 pr-8">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRoundPlus aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="text-lg">Create staff account</DialogTitle>
              <DialogDescription>
                Invite a teammate to CRM. They’ll verify their email and set a
                password.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 px-5 pb-5 pt-5 sm:px-6 sm:pb-6"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Account details</h3>
              <p className="text-xs text-muted-foreground">
                Use the name and work email they’ll use to sign in.
              </p>
            </div>

            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="staff-name">
                Full name <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="staff-name"
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  aria-required="true"
                  aria-invalid={Boolean(form.formState.errors.name)}
                  {...form.register("name")}
                />
                <FieldError
                  errors={
                    form.formState.errors.name
                      ? [form.formState.errors.name]
                      : []
                  }
                />
              </FieldContent>
            </Field>

            <Field data-invalid={Boolean(form.formState.errors.email)}>
              <FieldLabel htmlFor="staff-email">
                Work email <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  aria-required="true"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  {...form.register("email")}
                />
                <FieldDescription className="flex items-center gap-1.5">
                  <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                  The secure account setup link will be sent here.
                </FieldDescription>
                <FieldError
                  errors={
                    form.formState.errors.email
                      ? [form.formState.errors.email]
                      : []
                  }
                />
              </FieldContent>
            </Field>
          </div>

          <section
            aria-labelledby="staff-access-heading"
            className="space-y-4 border-t pt-5"
          >
            <div className="space-y-1">
              <h3 id="staff-access-heading" className="text-sm font-semibold">
                Team access
              </h3>
              <p className="text-xs text-muted-foreground">
                Choose where this teammate works.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(form.formState.errors.department)}>
                <FieldLabel htmlFor="staff-department">
                  Department{" "}
                  <span aria-hidden="true" className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="staff-department"
                          aria-required="true"
                          aria-invalid={Boolean(form.formState.errors.department)}
                          className="w-full"
                        >
                          <SelectValue placeholder="Choose department" />
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
                <div className="text-sm font-medium leading-snug">Role</div>
                <FieldContent>
                  <div className="flex min-h-9 items-center gap-2 rounded-md border border-border bg-muted/40 px-3">
                    <ShieldCheck
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="text-sm font-medium">Staff</span>
                  </div>
                  <FieldDescription>
                    Admin access is managed separately.
                  </FieldDescription>
                </FieldContent>
              </Field>
            </div>
          </section>

          <DialogFooter className="border-t pt-4 [&>button]:w-full sm:[&>button]:w-auto">
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
              {mutation.isPending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <UserRoundPlus aria-hidden="true" className="size-4" />
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
