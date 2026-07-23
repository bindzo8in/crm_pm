"use client";
import * as z from "zod";
import { CustomerSchema, customerSchema } from "@/lib/schemas/customer-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, UseFormReturn } from "react-hook-form";
import { motion } from "motion/react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import {
    Field,
    FieldGroup,
    FieldContent,
    FieldLabel,
    FieldDescription,
    FieldError,
    FieldSeparator,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CustomerType } from "@/app/generated/prisma/enums";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateCustomer, UpdateCustomer } from "@/actions/customer";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { useEffect, useState } from "react";
import { PhoneInput } from "@/components/reui/phone-input";
import { Customer } from "@/app/generated/prisma/client";

export function CustomerForm({ defaultValues, error }: { defaultValues?: Customer | null, error?: string }) {
    const router = useRouter();

    const form = useForm<CustomerSchema>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            id: defaultValues?.id,

            displayName: defaultValues?.displayName || "",
            companyName: defaultValues?.companyName || "",

            primaryContactName: defaultValues?.primaryContactName || "",
            primaryContactEmail: defaultValues?.primaryContactEmail || "",
            primaryContactPhone: defaultValues?.primaryContactPhone || "",

            website: defaultValues?.website || "",

            addressLine1: defaultValues?.addressLine1 || "",
            addressLine2: defaultValues?.addressLine2 || "",
            city: defaultValues?.city || "",
            state: defaultValues?.state || "",
            country: defaultValues?.country || "",
            postalCode: defaultValues?.postalCode || "",

            billingAddressLine1: defaultValues?.billingAddressLine1 || "",
            billingAddressLine2: defaultValues?.billingAddressLine2 || "",
            billingCity: defaultValues?.billingCity || "",
            billingState: defaultValues?.billingState || "",
            billingCountry: defaultValues?.billingCountry || "",
            billingPostalCode: defaultValues?.billingPostalCode || "",

            gstNumber: defaultValues?.gstNumber || "",
            panNumber: defaultValues?.panNumber || "",

            internalNotes: defaultValues?.internalNotes || "",
            customerType: defaultValues?.customerType || CustomerType.BUSINESS,

        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: defaultValues?.id ? UpdateCustomer : CreateCustomer,
        onSuccess: (ctx) => {
            toast.success(ctx.message)
            if (defaultValues?.id) form.reset();
            router.push("/dashboard/customers")
        },
        onError: (ctx) => {
            toast.error(ctx.message)
        }
    })

    function copyAddressToBilling(form: UseFormReturn<CustomerSchema>) {
        const values = form.getValues();

        form.setValue(
            "billingAddressLine1",
            values.addressLine1
        );

        form.setValue(
            "billingAddressLine2",
            values.addressLine2
        );

        form.setValue(
            "billingCity",
            values.city
        );

        form.setValue(
            "billingState",
            values.state
        );

        form.setValue(
            "billingCountry",
            values.country
        );

        form.setValue(
            "billingPostalCode",
            values.postalCode
        );
    }

    const handleSubmit = form.handleSubmit((data: CustomerSchema) => {
        mutate(data)
    });

    return (
        <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mx-auto"
        >
            <div className="flex justify-between items-center">
                <h1 className="mt-6 mb-1 font-extrabold text-3xl tracking-tight col-span-full">
                    {defaultValues?.id ? "Update" : "Create"} Customer
                </h1>
                <Link href="/dashboard/customers">
                    <Button type="button" size="lg" variant="outline">
                        <ArrowLeft />Goto Customers
                    </Button>
                </Link>
            </div>
            <FieldSeparator className="my-4" />
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Basic Information
                </h2>

                <Controller
                    name="customerType"
                    control={form.control}
                    render={({ field, fieldState }) => {
                        const options = [
                            { label: "Business", value: "BUSINESS" },
                            { label: "Individual", value: "INDIVIDUAL" },
                        ];
                        return (
                            <Field
                                data-invalid={fieldState.invalid}
                                className="gap-1 col-span-full"
                            >
                                <FieldLabel htmlFor="customerType">Customer Type </FieldLabel>

                                <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select customer type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {options.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        );
                    }}
                />

                <Controller
                    name="displayName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="displayName">Display Name </FieldLabel>
                            <Input
                                {...field}
                                id="displayName"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter display name"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="companyName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="companyName">Company Name </FieldLabel>
                            <Input
                                {...field}
                                id="companyName"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter company name"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="primaryContactName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="primaryContactName">
                                Primary Contact Name{" "}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="primaryContactName"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter primary contact name"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="primaryContactEmail"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="primaryContactEmail">
                                Primary Contact Email{" "}
                            </FieldLabel>

                            <Input
                                {...field}
                                id="primaryContactEmail"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter primary contact email"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="primaryContactPhone"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="primaryContactPhone">
                                Primary Contact Phone{" "}
                            </FieldLabel>
                            <PhoneInput
                                {...field}
                                defaultCountry="IN"
                                placeholder="Enter primary contact phone"
                                aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="website"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="website">Website </FieldLabel>
                            <Input
                                {...field}
                                id="website"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter website"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Address Information
                </h2>

                <Controller
                    name="addressLine1"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="addressLine1">Address Line 1 </FieldLabel>
                            <Input
                                {...field}
                                id="addressLine1"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter address line 1"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="addressLine2"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="addressLine2">Address Line 2 </FieldLabel>
                            <Input
                                {...field}
                                id="addressLine2"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter address line 2"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="city"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="city">City </FieldLabel>
                            <Input
                                {...field}
                                id="city"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter city"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="state"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="state">State </FieldLabel>
                            <LocationAutocomplete
                                type="state"
                                id="state"
                                value={field.value || ""}
                                onChange={field.onChange}
                                countryCode={form.watch("country")}
                                placeholder="Start typing state name (e.g. Tamil Nadu)..."
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="country"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="country">Country </FieldLabel>
                            <LocationAutocomplete
                                type="country"
                                id="country"
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Start typing country name (e.g. India)..."
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="postalCode"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="postalCode">Postal Code </FieldLabel>
                            <Input
                                {...field}
                                id="postalCode"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter postal code"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
                <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
                    Billing Address Information
                </h2>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => copyAddressToBilling(form)}
                >
                    <Copy size={8} /> Copy From Address
                </Button>

                <Controller
                    name="billingAddressLine1"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="billingAddressLine1">
                                Billing Address Line 1{" "}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="billingAddressLine1"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter billing address line 1"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="billingAddressLine2"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="billingAddressLine2">
                                Billing Address Line 2{" "}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="billingAddressLine2"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter billing address line 2"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="billingCity"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="billingCity">Billing City </FieldLabel>
                            <Input
                                {...field}
                                id="billingCity"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter billing city"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="billingState"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="billingState">Billing State </FieldLabel>
                            <LocationAutocomplete
                                type="state"
                                id="billingState"
                                value={field.value || ""}
                                onChange={field.onChange}
                                countryCode={form.watch("billingCountry") || form.watch("country")}
                                placeholder="Start typing billing state name..."
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="billingCountry"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="billingCountry">Billing Country </FieldLabel>
                            <LocationAutocomplete
                                type="country"
                                id="billingCountry"
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="Start typing billing country name..."
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="billingPostalCode"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="billingPostalCode">
                                Billing Postal Code{" "}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="billingPostalCode"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter billing postal code"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="gstNumber"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="gstNumber">GST Number </FieldLabel>
                            <Input
                                {...field}
                                id="gstNumber"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter GST number"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="panNumber"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="panNumber">PAN Number </FieldLabel>
                            <Input
                                {...field}
                                id="panNumber"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter PAN number"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="internalNotes"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="internalNotes">Internal Notes </FieldLabel>
                            <Textarea
                                {...field}
                                aria-invalid={fieldState.invalid}
                                id="internalNotes"
                                placeholder="Enter any internal notes"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />


            </FieldGroup>
            <div className="flex justify-end items-center w-full">
                <Button disabled={isPending}>
                    {isPending ? defaultValues?.id ? "Updating..." : "Creating..." : defaultValues?.id ? "Update Customer" : "Create Customer"}
                </Button>
            </div>
        </form>
    );
}
