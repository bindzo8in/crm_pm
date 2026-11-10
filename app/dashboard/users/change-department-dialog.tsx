"use client";

import { z } from "zod";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  FieldDescription,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Department } from "@/app/generated/prisma/enums";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignUserDepartment } from "@/actions/user";
import { MultiSelect } from "@/components/ui/multi-select";

const schema = z.object({
  department: z.enum(Department).or(z.literal("NONE")),
  additionalDepartments: z.array(z.enum(Department)),
}).superRefine(({ department, additionalDepartments }, context) => {
  if (new Set(additionalDepartments).size !== additionalDepartments.length) {
    context.addIssue({
      code: "custom",
      path: ["additionalDepartments"],
      message: "Choose each additional department only once.",
    });
  }
  if (department !== "NONE" && additionalDepartments.includes(department)) {
    context.addIssue({
      code: "custom",
      path: ["additionalDepartments"],
      message: "The primary department cannot also be an additional department.",
    });
  }
});

type FormValues = z.infer<typeof schema>;

type ChangeDepartmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string | null;
    email: string;
    department?: Department | null;
    additionalDepartments?: Department[];
  };
};

const departmentsList = Object.values(Department);

export function ChangeDepartmentDialog({
  open,
  onOpenChange,
  user,
}: ChangeDepartmentDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: user.department ?? "NONE",
      additionalDepartments: user.additionalDepartments ?? [],
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      department: user.department ?? "NONE",
      additionalDepartments: user.additionalDepartments ?? [],
    });
  }, [form, open, user.additionalDepartments, user.department, user.id]);

  const primaryDepartment = useWatch({
    control: form.control,
    name: "department",
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      userId,
      department,
      additionalDepartments,
    }: {
      userId: string;
      department: Department | null;
      additionalDepartments: Department[];
    }) => assignUserDepartment(userId, { department, additionalDepartments }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setError(
        error instanceof Error ? error.message : "Failed to update departments.",
      );
    },
  });

  const onSubmit = async (values: FormValues) => {
    const targetDept = values.department === "NONE" ? null : values.department;
    const additionalDepartments = values.additionalDepartments.filter(
      (department) => department !== targetDept,
    );

    if (
      user.department === targetDept &&
      [...additionalDepartments].sort().join(",") ===
        [...(user.additionalDepartments ?? [])].sort().join(",")
    ) {
      onOpenChange(false);
      return;
    }

    mutation.mutate({
      userId: user.id,
      department: targetDept,
      additionalDepartments,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setError(null);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md bg-background border-border p-6 rounded-3xl shadow-2xl">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to update department</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogHeader>
          <DialogTitle>Manage departments</DialogTitle>
          <DialogDescription>
            Choose the primary department and any additional teams for {user.name || user.email}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel htmlFor="primary-department">Primary department</FieldLabel>
            <FieldContent>
              <Select
                value={primaryDepartment}
                onValueChange={(value) => {
                  const parsedDepartment = schema.shape.department.safeParse(value);
                  if (!parsedDepartment.success) return;
                  form.setValue("department", parsedDepartment.data, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  form.setValue(
                    "additionalDepartments",
                    form
                      .getValues("additionalDepartments")
                      .filter((department) => department !== parsedDepartment.data),
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              >
                <SelectTrigger id="primary-department" className="rounded-xl">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">-- None (Unassigned) --</SelectItem>
                  {departmentsList.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>

          <Field data-invalid={Boolean(form.formState.errors.additionalDepartments)}>
            <FieldLabel>Additional departments</FieldLabel>
            <FieldContent>
              <Controller
                control={form.control}
                name="additionalDepartments"
                render={({ field }) => (
                  <MultiSelect
                    label="Additional departments"
                    options={departmentsList
                      .filter((department) => department !== primaryDepartment)
                      .map((department) => ({
                        value: department,
                        label: department,
                      }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Choose additional departments"
                    searchPlaceholder="Search departments"
                  />
                )}
              />
              <FieldDescription>
                Additional membership does not grant department-specific permissions.
              </FieldDescription>
              <FieldError
                errors={
                  form.formState.errors.additionalDepartments
                    ? [form.formState.errors.additionalDepartments]
                    : []
                }
              />
            </FieldContent>
          </Field>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-xl font-semibold"
            >
              {mutation.isPending ? "Updating..." : "Save departments"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
