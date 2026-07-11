"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
    FieldSeparator,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Password } from "@/components/password";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { useSession, updateUser, changePassword } from "@/lib/auth-client";
import { useState } from "react";

const profileSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    image: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function AccountProfileForm() {
    const { data: session, isPending: isSessionLoading } = useSession();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        values: {
            name: session?.user?.name || "",
            image: session?.user?.image || null,
        },
    });

    const handleSubmit = form.handleSubmit(async (data: ProfileFormValues) => {
        setIsSaving(true);
        try {
            const result = await updateUser({
                name: data.name,
                image: data.image || undefined,
            });
            if (result.error) {
                toast.error(result.error.message || "Failed to update profile");
            } else {
                toast.success("Profile updated successfully");
            }
        } catch (error) {
            toast.error("An error occurred while updating profile");
        } finally {
            setIsSaving(false);
        }
    });

    if (isSessionLoading) return <div className="p-8">Loading...</div>;

    return (
        <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border "
        >
            <div className="flex justify-between items-center">
                <h2 className="mt-2 mb-1 font-extrabold text-2xl tracking-tight col-span-full">
                    Profile Information
                </h2>
            </div>
            <FieldSeparator className="my-4" />

            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <Controller
                    name="image"
                    control={form.control}
                    render={({ field }) => (
                        <Field className="gap-1 col-span-full">
                            <FieldLabel>Profile Image</FieldLabel>
                            <ImageUpload
                                value={field.value ? { url: field.value, publicId: "" } : null}
                                onChange={(val) => field.onChange(val?.url || null)}
                                disabled={isSaving}
                            />
                        </Field>
                    )}
                />

                <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-4">
                            <FieldLabel htmlFor="name">Full Name</FieldLabel>
                            <Input {...field} id="name" placeholder="John Doe" disabled={isSaving} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Field className="gap-1 col-span-full md:col-span-4">
                    <FieldLabel>Email (Read-only)</FieldLabel>
                    <Input value={session?.user?.email || ""} disabled />
                </Field>

            </FieldGroup>

            <div className="flex justify-end items-center w-full">
                <Button disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Profile"}
                </Button>
            </div>
        </form>
    );
}

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function AccountPasswordForm() {
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const handleSubmit = form.handleSubmit(async (data: PasswordFormValues) => {
        setIsSaving(true);
        try {
            const result = await changePassword({
                newPassword: data.newPassword,
                currentPassword: data.currentPassword,
                revokeOtherSessions: true,
            });
            if (result.error) {
                toast.error(result.error.message || "Failed to change password");
            } else {
                toast.success("Password changed successfully");
                form.reset();
            }
        } catch (error) {
            toast.error("An error occurred while changing password");
        } finally {
            setIsSaving(false);
        }
    });

    return (
        <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mt-8"
        >
            <div className="flex justify-between items-center">
                <h2 className="mt-2 mb-1 font-extrabold text-2xl tracking-tight col-span-full">
                    Change Password
                </h2>
            </div>
            <FieldSeparator className="my-4" />

            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <Controller
                    name="currentPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-4">
                            <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                            <Password {...field} id="currentPassword" disabled={isSaving} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="newPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-4">
                            <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                            <Password {...field} id="newPassword" disabled={isSaving} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-4">
                            <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                            <Password {...field} id="confirmPassword" disabled={isSaving} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </FieldGroup>

            <div className="flex justify-end items-center w-full">
                <Button disabled={isSaving}>
                    {isSaving ? "Changing Password..." : "Change Password"}
                </Button>
            </div>
        </form>
    );
}
