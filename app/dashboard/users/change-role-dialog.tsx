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
import { UserRole } from "@/app/generated/prisma/enums";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changeUserRole } from "@/actions/user";

const schema = z.object({
    role: z.enum(UserRole),
});

type FormValues = z.infer<typeof schema>;
type ChangeRoleDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserWithRole;
    currentUserRole: UserRole;
    currentUserId: string;
};

export const assignableRoles: Record<UserRole, UserRole[]> = {
    SUPER_ADMIN: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.STAFF,
    ],

    ADMIN: [
        UserRole.STAFF,
    ],

    STAFF: []

};

export function ChangeRoleDialog({ open, onOpenChange, user, currentUserRole, currentUserId }: ChangeRoleDialogProps) {
    const [error, setError] = useState<string | null>(null);

    const availableRoles =
        assignableRoles[currentUserRole] ?? [];

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            role: user.role as FormValues["role"],
        },
    });

    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: ({
            userId,
            role,
        }: {
            userId: string;
            role: UserRole;
        }) =>
            changeUserRole(userId, role),

        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["users"],
            });

            onOpenChange(false);
        },
        onError: (error) => {
            setError(error.message);
        }
    });

    const onSubmit = async (values: FormValues) => {

        if (user.role === values.role) {
            onOpenChange(false);
            return;
        }

        if (user.id === currentUserId) {
            setError("You cannot change your own role.");
            return;
        }

        mutation.mutate({
            userId: user.id,
            role: values.role,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* <DialogTrigger asChild>
                <Button variant="outline">
                    <UserKey /> Change Role
                </Button>
            </DialogTrigger> */}

            <DialogContent>
                {error &&
                    <Alert variant={"destructive"}>
                        <AlertTitle>Unable to update the role</AlertTitle>
                        <AlertDescription>Error: {error}</AlertDescription>
                    </Alert>
                }
                <DialogHeader>
                    <DialogTitle>Update Role</DialogTitle>
                    <DialogDescription>
                        Update the user's role.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <Field>
                        <FieldLabel>Role</FieldLabel>

                        <FieldContent>
                            <Select
                                value={form.watch("role")}
                                onValueChange={(value) =>
                                    form.setValue(
                                        "role",
                                        value as FormValues["role"],
                                        {
                                            shouldValidate: true,
                                        }
                                    )
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>

                                <SelectContent>
                                    {availableRoles.map((role) => (
                                        <SelectItem
                                            key={role}
                                            value={role}
                                        >
                                            {role
                                                .replaceAll("_", " ")
                                                .toLowerCase()
                                                .replace(/\b\w/g, c => c.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <FieldError
                                errors={
                                    form.formState.errors.role
                                        ? [form.formState.errors.role]
                                        : []
                                }
                            />
                        </FieldContent>
                    </Field>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={mutation.isPending}
                        >
                            Update Role
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}