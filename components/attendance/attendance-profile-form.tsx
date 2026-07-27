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
import { Badge } from "@/components/ui/badge";
import {
  UserIcon,
  ShieldCheckIcon,
  Building2Icon,
  CalendarIcon,
  KeyRoundIcon,
  CheckCircle2Icon,
  SparklesIcon,
} from "lucide-react";
import { format } from "date-fns";

const profileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  image: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface AttendanceProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string;
    department: string | null;
    createdAt: string | Date;
  };
}

export function AttendanceProfileOverviewCard({ user }: AttendanceProfileFormProps) {
  const departmentDisplay = user.department ? user.department.replace("_", " ") : "Unassigned";
  const formattedDate = user.createdAt
    ? format(new Date(user.createdAt), "MMM d, yyyy")
    : "N/A";

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
      
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
        <div className="relative">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 shadow-md"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center text-primary font-bold text-3xl shadow-md">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
          <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-background rounded-full flex items-center justify-center text-white" title="Active Account">
            <CheckCircle2Icon className="w-3 h-3" />
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{user.name}</h1>
            <Badge variant="secondary" className="rounded-xl px-3 py-1 font-semibold text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              {user.role}
            </Badge>
            <Badge variant="outline" className="rounded-xl px-3 py-1 font-semibold text-xs border-border flex items-center gap-1">
              <Building2Icon className="w-3.5 h-3.5 text-primary" />
              {departmentDisplay}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground font-medium">{user.email}</p>

          <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-xl border border-border/50">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <span>Joined: {formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <SparklesIcon className="w-4 h-4" />
              <span>Attendance Portal Access Granted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AttendanceProfileForm({ user }: AttendanceProfileFormProps) {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user.name || session?.user?.name || "",
      image: user.image || session?.user?.image || null,
    },
  });

  const handleSubmit = form.handleSubmit(async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      const result = await updateUser({
        name: data.name,
        image: data.image || undefined,
      });
      if (result?.error) {
        toast.error(result.error.message || "Failed to update profile");
      } else {
        toast.success("Attendance profile updated successfully");
      }
    } catch (error) {
      toast.error("An error occurred while updating profile");
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
          <UserIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-extrabold text-xl tracking-tight text-foreground">
            Personal Information
          </h2>
          <p className="text-xs text-muted-foreground">
            Update your profile display photo and personal details for attendance logs.
          </p>
        </div>
      </div>

      <FieldSeparator />

      <FieldGroup className="grid md:grid-cols-6 gap-6">
        <Controller
          name="image"
          control={form.control}
          render={({ field }) => (
            <Field className="gap-1.5 col-span-full">
              <FieldLabel className="font-semibold text-sm">Profile Avatar</FieldLabel>
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
            <Field data-invalid={fieldState.invalid} className="gap-1.5 col-span-full md:col-span-3">
              <FieldLabel htmlFor="name" className="font-semibold text-sm">Full Name</FieldLabel>
              <Input
                {...field}
                id="name"
                placeholder="John Doe"
                disabled={isSaving}
                className="rounded-xl border-border/80"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field className="gap-1.5 col-span-full md:col-span-3">
          <FieldLabel className="font-semibold text-sm">Email Address</FieldLabel>
          <Input
            value={user.email || session?.user?.email || ""}
            disabled
            className="rounded-xl bg-muted/60 text-muted-foreground border-border/60"
          />
        </Field>

        <Field className="gap-1.5 col-span-full md:col-span-3">
          <FieldLabel className="font-semibold text-sm">Role</FieldLabel>
          <Input
            value={user.role}
            disabled
            className="rounded-xl bg-muted/60 text-muted-foreground border-border/60 font-semibold"
          />
        </Field>

        <Field className="gap-1.5 col-span-full md:col-span-3">
          <FieldLabel className="font-semibold text-sm">Assigned Department</FieldLabel>
          <Input
            value={user.department ? user.department.replace("_", " ") : "Unassigned"}
            disabled
            className="rounded-xl bg-muted/60 text-muted-foreground border-border/60 font-semibold"
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end items-center pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="rounded-2xl px-6 font-semibold shadow-md"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export function AttendancePasswordForm() {
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
      if (result?.error) {
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
      className="bg-card border border-border/80 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
          <KeyRoundIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-extrabold text-xl tracking-tight text-foreground">
            Security & Password
          </h2>
          <p className="text-xs text-muted-foreground">
            Change your account password to maintain secure attendance portal access.
          </p>
        </div>
      </div>

      <FieldSeparator />

      <FieldGroup className="grid md:grid-cols-6 gap-6">
        <Controller
          name="currentPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5 col-span-full md:col-span-4">
              <FieldLabel htmlFor="currentPassword" className="font-semibold text-sm">
                Current Password
              </FieldLabel>
              <Password {...field} id="currentPassword" disabled={isSaving} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="newPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5 col-span-full md:col-span-4">
              <FieldLabel htmlFor="newPassword" className="font-semibold text-sm">
                New Password
              </FieldLabel>
              <Password {...field} id="newPassword" disabled={isSaving} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.5 col-span-full md:col-span-4">
              <FieldLabel htmlFor="confirmPassword" className="font-semibold text-sm">
                Confirm New Password
              </FieldLabel>
              <Password {...field} id="confirmPassword" disabled={isSaving} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex justify-end items-center pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="rounded-2xl px-6 font-semibold shadow-md"
        >
          {isSaving ? "Updating..." : "Change Password"}
        </Button>
      </div>
    </form>
  );
}
