"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Password } from "@/components/password";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { useSession, updateUser, changePassword } from "@/lib/auth-client";
import { useState } from "react";
import { KeyRoundIcon, UserRoundIcon } from "lucide-react";
import { LogoutConfirmButton } from "@/components/auth/logout-confirm-button";

const profileSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    image: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function AccountProfileForm({ showLogoutButton = true }: { showLogoutButton?: boolean }) {
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
            toast.error(
                error instanceof Error ? error.message : "An error occurred while updating profile"
            );
        } finally {
            setIsSaving(false);
        }
    });

    if (isSessionLoading) return <div className="p-8">Loading...</div>;

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full overflow-hidden rounded-3xl border border-border/70 bg-card"
        >
            <header className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-5 sm:px-7">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <UserRoundIcon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="font-heading text-lg font-bold tracking-tight sm:text-xl">
                            Personal information
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Update your photo and the name shown across CRM.
                        </p>
                    </div>
                </div>
                {showLogoutButton && <LogoutConfirmButton />}
            </header>

            <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-center">
                <Controller
                    name="image"
                    control={form.control}
                    render={({ field }) => (
                        <Field className="min-w-0 gap-2">
                            <ImageUpload
                                compact
                                value={field.value ? { url: field.value, publicId: "" } : null}
                                onChange={(val) => field.onChange(val?.url || null)}
                                scope="account-profile"
                                disabled={isSaving}
                            />
                        </Field>
                    )}
                />

                <FieldGroup className="grid min-w-0 gap-5">
                    <Controller
                        name="name"
                        control={form.control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="gap-2">
                                <FieldLabel htmlFor="name" className="text-sm font-semibold">Full name</FieldLabel>
                                <Input
                                    {...field}
                                    id="name"
                                    placeholder="Your name"
                                    disabled={isSaving}
                                    className="h-11 rounded-xl border-border/80 bg-background"
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                        )}
                    />

                    <Field className="gap-2">
                        <FieldLabel htmlFor="accountEmail" className="text-sm font-semibold">Email address</FieldLabel>
                        <Input
                            id="accountEmail"
                            value={session?.user?.email || ""}
                            disabled
                            className="h-11 rounded-xl border-border/60 bg-muted/50 text-muted-foreground"
                        />
                    </Field>
                </FieldGroup>
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <p className="text-xs text-muted-foreground">
                    Your role and department are managed by your administrator.
                </p>
                <Button disabled={isSaving} className="rounded-xl px-5">
                    {isSaving ? "Saving changes..." : "Save changes"}
                </Button>
            </footer>
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
            toast.error(
                error instanceof Error ? error.message : "An error occurred while changing password"
            );
        } finally {
            setIsSaving(false);
        }
    });

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full overflow-hidden rounded-3xl border border-border/70 bg-card"
        >
            <header className="flex items-center gap-3 border-b border-border/60 px-5 py-5 sm:px-7">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <KeyRoundIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                    <h2 className="font-heading text-lg font-bold tracking-tight sm:text-xl">
                        Password & security
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Change your password to keep your account secure.
                    </p>
                </div>
            </header>

            <FieldGroup className="grid gap-5 p-5 sm:p-7 md:grid-cols-2">
                <Controller
                    name="currentPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-2">
                            <FieldLabel htmlFor="currentPassword" className="text-sm font-semibold">Current password</FieldLabel>
                            <Password {...field} id="currentPassword" disabled={isSaving} className="h-11 rounded-xl" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="newPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-2">
                            <FieldLabel htmlFor="newPassword" className="text-sm font-semibold">New password</FieldLabel>
                            <Password {...field} id="newPassword" disabled={isSaving} className="h-11 rounded-xl" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-2">
                            <FieldLabel htmlFor="confirmPassword" className="text-sm font-semibold">Confirm new password</FieldLabel>
                            <Password {...field} id="confirmPassword" disabled={isSaving} className="h-11 rounded-xl" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </FieldGroup>

            <footer className="flex justify-end border-t border-border/60 bg-muted/20 px-5 py-4 sm:px-7">
                <Button disabled={isSaving} className="rounded-xl px-5">
                    {isSaving ? "Updating password..." : "Update password"}
                </Button>
            </footer>
        </form>
    );
}
