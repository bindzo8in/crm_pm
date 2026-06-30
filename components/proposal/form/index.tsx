"use client";
import { proposalSchema, type ProposalSchema } from "@/lib/schemas/proposal-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CustomerCombobox } from "@/components/customers/customer-combobox";
import { PlusIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { ServiceCombobox, ServiceOption } from "./service-combobox";
import { ServicePackageCombobox, ServicePackageOption } from "./service-package-combobox";

export function ProposalCreateEditForm() {

    const [selectedService, setSelectedService] =
        useState<ServiceOption | null>(null);

    const [selectedPackage, setSelectedPackage] =
        useState<ServicePackageOption | null>(null);

    const form = useForm<ProposalSchema>({
        resolver: zodResolver(proposalSchema),
        defaultValues: {
            currency: "INR",
            customerId: "",
            title: "",
            customerCompanyName: "",
            customerDisplayName: "",
            notes: "",
            status: "DRAFT",
            validUntil: "07_Days",

        }
    });
    const {
        formState: { isSubmitting },
    } = form;
    console.log(form.getValues())

    const handleSubmit = form.handleSubmit(async (data: ProposalSchema) => {
        try {
            // TODO: implement form submission
            console.log(data);
            form.reset();
        } catch (error) {
            // TODO: handle error
        }
    });

    return (
        <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mx-auto"
        >
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
                <Controller
                    name="customerId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="customerId">Customer</FieldLabel>
                            <CustomerCombobox
                                value={field.value}
                                onValueChange={(customer) => {
                                    field.onChange(customer.id);
                                    form.setValue(
                                        "customerDisplayName",
                                        customer.displayName,
                                        { shouldValidate: true, shouldDirty: true },
                                    );
                                    form.setValue(
                                        "customerCompanyName",
                                        customer.companyName ?? "",
                                        { shouldValidate: true, shouldDirty: true },
                                    );
                                }}
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="title"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="title">Proposal Title </FieldLabel>
                            <Input
                                {...field}
                                id="title"
                                type="text"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter title of the proposal"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    control={form.control}
                    name="validUntil"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                            <FieldLabel>Valid Until</FieldLabel>

                            <FieldContent>
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select validity" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="07_Days">
                                            7 Days
                                        </SelectItem>

                                        <SelectItem value="15_Days">
                                            15 Days
                                        </SelectItem>

                                        <SelectItem value="30_Days">
                                            30 Days
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <FieldDescription>
                                    How long this proposal remains valid.
                                </FieldDescription>

                                {fieldState.error && (
                                    <FieldError>
                                        {fieldState.error.message}
                                    </FieldError>
                                )}
                            </FieldContent>
                        </Field>
                    )}
                />


            </FieldGroup>

            <FieldSeparator />

            <Dialog>
                <div className="my-2 flex justify-end items-center">
                    <DialogTrigger asChild>
                        <Button><PlusIcon /> Add Service</Button>
                    </DialogTrigger>
                </div>

                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Select Service & packages</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        Select Service & packages
                    </DialogDescription>
                    <Controller
                        control={form.control}
                        name="serviceId"
                        render={({ field, fieldState }) => (
                            <Field>
                                <FieldLabel>Service</FieldLabel>

                                <FieldContent>
                                    <ServiceCombobox
                                        value={selectedService}
                                        onValueChange={(service) => {
                                            setSelectedService(service);

                                            field.onChange(service?.id ?? "");

                                            // reset package
                                            setSelectedPackage(null);
                                            form.setValue("packageId", "");
                                        }}
                                    />

                                    {fieldState.error && (
                                        <FieldError>
                                            {fieldState.error.message}
                                        </FieldError>
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="packageId"
                        render={({ field, fieldState }) => (
                            <Field>
                                <FieldLabel>Package</FieldLabel>

                                <FieldContent>
                                    <ServicePackageCombobox
                                        serviceId={selectedService?.id}
                                        value={selectedPackage}
                                        onValueChange={(pkg) => {
                                            setSelectedPackage(pkg);

                                            field.onChange(pkg?.id ?? "");
                                        }}
                                    />

                                    {fieldState.error && (
                                        <FieldError>
                                            {fieldState.error.message}
                                        </FieldError>
                                    )}
                                </FieldContent>
                            </Field>
                        )}
                    />
                </DialogContent>
            </Dialog>
            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
            </FieldGroup>

            <div className="flex justify-end items-center w-full">
                <Button disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
            </div>
        </form>
    );
}
