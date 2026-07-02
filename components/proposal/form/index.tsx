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
import { Textarea } from "@/components/ui/textarea";
import { createProposal, updateProposal } from "@/actions/proposal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProposalCreateEditFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialData?: any;
}

export function ProposalCreateEditForm({ initialData }: ProposalCreateEditFormProps) {
    const router = useRouter();
    const form = useForm<ProposalSchema>({
        resolver: zodResolver(proposalSchema),
        defaultValues: initialData ? {
            customerId: initialData.customerId,
            title: initialData.title,
            customerCompanyName: initialData.customerCompanyName || "",
            customerDisplayName: initialData.customerDisplayName || "",
            notes: initialData.notes || "",
            validUntil: initialData.validUntil as "07_Days" | "15_Days" | "30_Days",
        } : {
            customerId: "",
            title: "",
            customerCompanyName: "",
            customerDisplayName: "",
            notes: "",
            validUntil: "07_Days",
        }
    });
    const {
        formState: { isSubmitting },
    } = form;
    console.log(form.getValues())

    const handleSubmit = form.handleSubmit(async (data) => {
        let response;
        if (initialData) {
            response = await updateProposal(initialData.id, data);
        } else {
            response = await createProposal(data);
        }

        if (!response.success) {
            if (Array.isArray(response.error)) {
                response.error.forEach((issue) => {
                    form.setError(issue.path[0] as keyof ProposalSchema, {
                        message: issue.message,
                    });
                });

                return;
            }

            toast.error(response.message);
            return;
        }

        toast.success(response.message);

        if (initialData) {
            router.push(`/dashboard/proposals/${initialData.id}/builder`);
        } else {
            router.push(`/dashboard/proposals/${response.data!.id}/builder`);
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

                <Controller
                    name="notes"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-1 col-span-full"
                        >
                            <FieldLabel htmlFor="notes">Notes</FieldLabel>
                            <Textarea
                                {...field}
                                id="notes"
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                aria-invalid={fieldState.invalid}
                                placeholder="Enter notes for this proposal"
                            />

                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

            </FieldGroup>

            <FieldSeparator />

            <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
            </FieldGroup>

            <div className="flex justify-end items-center w-full">
                <Button disabled={isSubmitting}>
                    {isSubmitting ? (initialData ? "Updating..." : "Submitting...") : (initialData ? "Update" : "Submit")}
                </Button>
            </div>
        </form>
    );
}
