"use client";

import * as z from "zod";
import { companySchema, CompanyFormValues } from "@/lib/schemas/company";
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
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateCompany } from "@/actions/company";
import { toast } from "sonner";
import { PhoneInput } from "@/components/reui/phone-input";
import { ImageUpload } from "@/components/ui/image-upload";

export function CompanyProfileForm({ defaultValues }: { defaultValues?: any }) {
    const queryClient = useQueryClient();

    const form = useForm<CompanyFormValues>({
        resolver: zodResolver(companySchema),
        defaultValues: {
            displayName: defaultValues?.displayName || "",
            legalName: defaultValues?.legalName || "",
            tagline: defaultValues?.tagline || "",
            about: defaultValues?.about || "",

            website: defaultValues?.website || "",
            email: defaultValues?.email || "",
            supportEmail: defaultValues?.supportEmail || "",
            salesEmail: defaultValues?.salesEmail || "",
            phone: defaultValues?.phone || "",

            gstNumber: defaultValues?.gstNumber || "",
            panNumber: defaultValues?.panNumber || "",
            cinNumber: defaultValues?.cinNumber || "",

            address: defaultValues?.address || "",
            city: defaultValues?.city || "",
            state: defaultValues?.state || "",
            country: defaultValues?.country || "",
            postalCode: defaultValues?.postalCode || "",
            googleMapUrl: defaultValues?.googleMapUrl || "",

            logo: defaultValues?.logo || null,
            darkLogo: defaultValues?.darkLogo || null,
            favicon: defaultValues?.favicon || null,
            signatureImage: defaultValues?.signatureImage || null,
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: UpdateCompany,
        onSuccess: (ctx) => {
            if (ctx.error) {
                toast.error(ctx.message)
            } else {
                toast.success(ctx.message)
                queryClient.invalidateQueries({ queryKey: ["company"] })
            }
        },
        onError: (ctx: any) => {
            toast.error(ctx.message || "An error occurred")
        }
    })

    const handleSubmit = form.handleSubmit((data: CompanyFormValues) => {
        mutate(data)
    });

    return (
        <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mx-auto"
        >
            <div className="flex justify-between items-center">
                <h1 className="mt-6 mb-1 font-extrabold text-3xl tracking-tight col-span-full">
                    Company Profile
                </h1>
            </div>
            <FieldSeparator className="my-4" />

            {/* Information */}
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Company Information
                </h2>

                <Controller
                    name="displayName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
                            <Input {...field} id="displayName" placeholder="e.g. Acme Corp" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="legalName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="legalName">Legal Name</FieldLabel>
                            <Input {...field} id="legalName" placeholder="e.g. Acme Corporation Inc." />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="tagline"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
                            <Input {...field} value={field.value || ""} id="tagline" placeholder="Company Tagline" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="about"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                            <FieldLabel htmlFor="about">About</FieldLabel>
                            <Textarea {...field} value={field.value || ""} id="about" placeholder="About the company..." />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </FieldGroup>

            <FieldSeparator className="my-4" />

            {/* Contact Information */}
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Contact Information
                </h2>

                <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="email">Primary Email</FieldLabel>
                            <Input {...field} id="email" placeholder="contact@acme.com" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="phone"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="phone">Phone</FieldLabel>
                            <PhoneInput {...field} defaultCountry="IN" placeholder="Primary Phone" aria-invalid={fieldState.invalid} />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="supportEmail"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="supportEmail">Support Email</FieldLabel>
                            <Input {...field} value={field.value || ""} id="supportEmail" placeholder="support@acme.com" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="salesEmail"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="salesEmail">Sales Email</FieldLabel>
                            <Input {...field} value={field.value || ""} id="salesEmail" placeholder="sales@acme.com" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="website"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="website">Website</FieldLabel>
                            <Input {...field} value={field.value || ""} id="website" placeholder="https://acme.com" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </FieldGroup>

            <FieldSeparator className="my-4" />

            {/* Tax Information */}
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Tax Information
                </h2>

                <Controller
                    name="gstNumber"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-2">
                            <FieldLabel htmlFor="gstNumber">GST Number</FieldLabel>
                            <Input {...field} value={field.value || ""} id="gstNumber" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="panNumber"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-2">
                            <FieldLabel htmlFor="panNumber">PAN Number</FieldLabel>
                            <Input {...field} value={field.value || ""} id="panNumber" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="cinNumber"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-2">
                            <FieldLabel htmlFor="cinNumber">CIN Number</FieldLabel>
                            <Input {...field} value={field.value || ""} id="cinNumber" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </FieldGroup>

            <FieldSeparator className="my-4" />

            {/* Address */}
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Address
                </h2>

                <Controller
                    name="address"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                            <FieldLabel htmlFor="address">Address</FieldLabel>
                            <Input {...field} id="address" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="city"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="city">City</FieldLabel>
                            <Input {...field} id="city" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="state"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="state">State</FieldLabel>
                            <Input {...field} id="state" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="country"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="country">Country</FieldLabel>
                            <Input {...field} id="country" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="postalCode"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel htmlFor="postalCode">Postal Code</FieldLabel>
                            <Input {...field} value={field.value || ""} id="postalCode" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="googleMapUrl"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                            <FieldLabel htmlFor="googleMapUrl">Google Map URL</FieldLabel>
                            <Input {...field} value={field.value || ""} id="googleMapUrl" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </FieldGroup>

            <FieldSeparator className="my-4" />

            {/* Branding */}
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Branding
                </h2>

                <Controller
                    name="logo"
                    control={form.control}
                    render={({ field }) => (
                        <Field className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel>Logo</FieldLabel>
                            <ImageUpload
                                value={field.value || null}
                                onChange={field.onChange}
                                disabled={isPending}
                            />
                        </Field>
                    )}
                />

                <Controller
                    name="darkLogo"
                    control={form.control}
                    render={({ field }) => (
                        <Field className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel>Dark Logo</FieldLabel>
                            <ImageUpload
                                value={field.value || null}
                                onChange={field.onChange}
                                disabled={isPending}
                            />
                        </Field>
                    )}
                />

                <Controller
                    name="favicon"
                    control={form.control}
                    render={({ field }) => (
                        <Field className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel>Favicon</FieldLabel>
                            <ImageUpload
                                value={field.value || null}
                                onChange={field.onChange}
                                disabled={isPending}
                            />
                        </Field>
                    )}
                />

                <Controller
                    name="signatureImage"
                    control={form.control}
                    render={({ field }) => (
                        <Field className="gap-1 col-span-full md:col-span-3">
                            <FieldLabel>Signature</FieldLabel>
                            <ImageUpload
                                value={field.value || null}
                                onChange={field.onChange}
                                disabled={isPending}
                            />
                        </Field>
                    )}
                />
            </FieldGroup>

            <div className="flex justify-end items-center w-full">
                <Button disabled={isPending}>
                    {isPending ? "Saving..." : "Save Settings"}
                </Button>
            </div>
        </form>
    );
}
