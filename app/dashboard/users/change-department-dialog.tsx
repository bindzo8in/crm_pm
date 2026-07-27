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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserWithRole } from "better-auth/plugins/admin";
import { UserRole, Department } from "@/app/generated/prisma/enums";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignUserDepartment } from "@/actions/user";

const schema = z.object({
  department: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

type ChangeDepartmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole & { department?: Department | null };
  currentUserRole: UserRole;
  currentUserId: string;
};

const departmentsList = Object.values(Department);

export function ChangeDepartmentDialog({
  open,
  onOpenChange,
  user,
  currentUserRole,
  currentUserId,
}: ChangeDepartmentDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: (user.department as string) || "NONE",
    },
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      userId,
      department,
    }: {
      userId: string;
      department: Department | null;
    }) => assignUserDepartment(userId, department),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"],
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to update department");
    },
  });

  const onSubmit = async (values: FormValues) => {
    const targetDept = values.department === "NONE" ? null : (values.department as Department);

    if (user.department === targetDept) {
      onOpenChange(false);
      return;
    }

    mutation.mutate({
      userId: user.id,
      department: targetDept,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border p-6 rounded-3xl shadow-2xl">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to update department</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogHeader>
          <DialogTitle>Assign Department</DialogTitle>
          <DialogDescription>
            Assign or change the organizational department for {user.name || user.email}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Department</FieldLabel>
            <FieldContent>
              <Select
                value={form.watch("department") || "NONE"}
                onValueChange={(val) => form.setValue("department", val)}
              >
                <SelectTrigger className="rounded-xl">
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
              {mutation.isPending ? "Updating..." : "Save Department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
