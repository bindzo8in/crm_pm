"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { completeInitialSetup } from "@/actions/initial-setup";
import {
  initialSetupSchema,
  type InitialSetupFormInput,
  type InitialSetupInput,
} from "@/lib/schemas/initial-setup";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoaderCircle, MapPin, ShieldCheck } from "lucide-react";

type InitialSetupDefaults = Partial<
  Omit<
    InitialSetupFormInput,
    | "gracePeriodMinutes"
    | "officeLatitude"
    | "officeLongitude"
    | "officeRadiusMeters"
  >
> & {
  gracePeriodMinutes?: number;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
  officeRadiusMeters?: number;
};

export function InitialSetupForm({
  email,
  contactName,
  defaults,
}: {
  email: string;
  contactName: string;
  defaults: InitialSetupDefaults;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const form = useForm<InitialSetupFormInput, undefined, InitialSetupInput>({
    resolver: zodResolver(initialSetupSchema),
    defaultValues: {
      displayName: defaults.displayName ?? "",
      legalName: defaults.legalName ?? "",
      email: defaults.email ?? email,
      phone: defaults.phone ?? "",
      address: defaults.address ?? "",
      city: defaults.city ?? "",
      state: defaults.state ?? "",
      country: defaults.country ?? "",
      postalCode: defaults.postalCode ?? "",
      expectedClockIn: defaults.expectedClockIn ?? "09:00",
      expectedClockOut: defaults.expectedClockOut ?? "18:00",
      attendanceReminderTime: defaults.attendanceReminderTime ?? "08:30",
      gracePeriodMinutes: String(defaults.gracePeriodMinutes ?? 15),
      officeLatitude:
        defaults.officeLatitude === undefined || defaults.officeLatitude === null
          ? ""
          : String(defaults.officeLatitude),
      officeLongitude:
        defaults.officeLongitude === undefined || defaults.officeLongitude === null
          ? ""
          : String(defaults.officeLongitude),
      officeRadiusMeters: String(defaults.officeRadiusMeters ?? 500),
    },
  });

  console.log("form errors", form.formState.errors);

  const locateOffice = () => {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location access. Enter coordinates manually.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("officeLatitude", String(position.coords.latitude), {
          shouldValidate: true,
        });
        form.setValue("officeLongitude", String(position.coords.longitude), {
          shouldValidate: true,
        });
        setLocationMessage("Office coordinates captured. Confirm they match your workplace.");
      },
      () => {
        setLocationMessage("Location was unavailable. Allow location access or enter coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await completeInitialSetup(values);
    console.log("completeInitialSetup result", result);
    if (!result.success) {
      setError(result.error ?? "Setup could not be completed.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  });

  const fieldError = (name: keyof InitialSetupFormInput) =>
    form.formState.errors[name]?.message;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Setup could not be completed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Step 1 of 2
          </p>
          <h2 className="mt-1 text-lg font-semibold">Company profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us how to identify and contact your business.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Company display name *
            <Input {...form.register("displayName")} aria-invalid={Boolean(fieldError("displayName"))} />
            {fieldError("displayName") && <span className="block text-xs text-destructive">{fieldError("displayName")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Legal company name *
            <Input {...form.register("legalName")} aria-invalid={Boolean(fieldError("legalName"))} />
            {fieldError("legalName") && <span className="block text-xs text-destructive">{fieldError("legalName")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Company contact email *
            <Input type="email" autoComplete="email" {...form.register("email")} aria-invalid={Boolean(fieldError("email"))} />
            {fieldError("email") && <span className="block text-xs text-destructive">{fieldError("email")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Company phone *
            <Input type="tel" autoComplete="tel" {...form.register("phone")} aria-invalid={Boolean(fieldError("phone"))} />
            {fieldError("phone") && <span className="block text-xs text-destructive">{fieldError("phone")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            Street address *
            <Input autoComplete="street-address" {...form.register("address")} aria-invalid={Boolean(fieldError("address"))} />
            {fieldError("address") && <span className="block text-xs text-destructive">{fieldError("address")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            City *
            <Input autoComplete="address-level2" {...form.register("city")} aria-invalid={Boolean(fieldError("city"))} />
            {fieldError("city") && <span className="block text-xs text-destructive">{fieldError("city")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            State or region *
            <Input autoComplete="address-level1" {...form.register("state")} aria-invalid={Boolean(fieldError("state"))} />
            {fieldError("state") && <span className="block text-xs text-destructive">{fieldError("state")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Country *
            <Input autoComplete="country-name" {...form.register("country")} aria-invalid={Boolean(fieldError("country"))} />
            {fieldError("country") && <span className="block text-xs text-destructive">{fieldError("country")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Postal code
            <Input autoComplete="postal-code" {...form.register("postalCode")} />
            {fieldError("postalCode") && <span className="block text-xs text-destructive">{fieldError("postalCode")}</span>}
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Primary setup contact: {contactName} ({email})
        </p>
      </section>

      <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Step 2 of 2
          </p>
          <h2 className="mt-1 text-lg font-semibold">Shift and office attendance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These values determine expected attendance and the required office geofence.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Shift starts *
            <Input type="time" {...form.register("expectedClockIn")} aria-invalid={Boolean(fieldError("expectedClockIn"))} />
            {fieldError("expectedClockIn") && <span className="block text-xs text-destructive">{fieldError("expectedClockIn")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Shift ends *
            <Input type="time" {...form.register("expectedClockOut")} aria-invalid={Boolean(fieldError("expectedClockOut"))} />
            {fieldError("expectedClockOut") && <span className="block text-xs text-destructive">{fieldError("expectedClockOut")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Attendance reminder *
            <Input type="time" {...form.register("attendanceReminderTime")} aria-invalid={Boolean(fieldError("attendanceReminderTime"))} />
            {fieldError("attendanceReminderTime") && <span className="block text-xs text-destructive">{fieldError("attendanceReminderTime")}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Arrival grace period (minutes) *
            <Input type="number" min="0" max="120" {...form.register("gracePeriodMinutes")} aria-invalid={Boolean(fieldError("gracePeriodMinutes"))} />
            {fieldError("gracePeriodMinutes") && <span className="block text-xs text-destructive">{fieldError("gracePeriodMinutes")}</span>}
          </label>
        </div>

        <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">Office location</h3>
                <p className="text-xs text-muted-foreground">
                  Attendance check-in uses this location and radius.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={locateOffice} className="w-full sm:w-auto">
              Use current location
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium">
              Latitude *
              <Input inputMode="decimal" placeholder="e.g. 12.9716" {...form.register("officeLatitude")} aria-invalid={Boolean(fieldError("officeLatitude"))} />
              {fieldError("officeLatitude") && <span className="block text-xs text-destructive">{fieldError("officeLatitude")}</span>}
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Longitude *
              <Input inputMode="decimal" placeholder="e.g. 77.5946" {...form.register("officeLongitude")} aria-invalid={Boolean(fieldError("officeLongitude"))} />
              {fieldError("officeLongitude") && <span className="block text-xs text-destructive">{fieldError("officeLongitude")}</span>}
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Allowed radius (meters) *
              <Input type="number" min="10" max="100000" {...form.register("officeRadiusMeters")} aria-invalid={Boolean(fieldError("officeRadiusMeters"))} />
              {fieldError("officeRadiusMeters") && <span className="block text-xs text-destructive">{fieldError("officeRadiusMeters")}</span>}
            </label>
          </div>
          {locationMessage && <p role="status" className="text-xs text-muted-foreground">{locationMessage}</p>}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
          Setup is required before the CRM and attendance portal can be used.
        </p>
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
          {form.formState.isSubmitting ? (
            <>
              Saving setup
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            </>
          ) : (
            "Complete setup"
          )}
        </Button>
      </div>
    </form>
  );
}
