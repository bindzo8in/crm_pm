"use client";

import { useState } from "react";
import { proposalSchema, type ProposalSchema } from "@/lib/schemas/proposal-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useWatch } from "react-hook-form";
import { getLiveExchangeRate } from "@/actions/exchange-rate";
import { RefreshCwIcon, Loader2Icon, XIcon } from "lucide-react";
import {
    Field,
    FieldGroup,
    FieldContent,
    FieldLabel,
    FieldDescription,
    FieldError,
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
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { CustomerForm } from "@/components/customers/create-edit";
import { Textarea } from "@/components/ui/textarea";
import { createProposal, updateProposal } from "@/actions/proposal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ProposalWorkflowNav } from "@/components/proposal/proposal-workflow-nav";
import { ProposalWorkflowActionBar } from "@/components/proposal/proposal-workflow-action-bar";

interface ProposalFormInitialData extends Partial<Omit<ProposalSchema, "customerDisplayName" | "customerCompanyName">> {
    id: string;
    customerId: string;
    customerDisplayName?: string | null;
    customerCompanyName?: string | null;
}

interface ProposalCreateEditFormProps {
    initialData?: ProposalFormInitialData;
}

export function ProposalCreateEditForm({ initialData }: ProposalCreateEditFormProps) {
    const router = useRouter();
    const [fetchingRate, setFetchingRate] = useState(false);
    const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(() => (
        initialData?.customerId
            ? {
                id: initialData.customerId,
                customerNumber: 0,
                displayName: initialData.customerDisplayName || "",
                companyName: initialData.customerCompanyName || null,
                primaryContactName: null,
            }
            : null
    ));

    const form = useForm<ProposalSchema>({
        resolver: zodResolver(proposalSchema),
        defaultValues: initialData ? {
            customerId: initialData.customerId,
            title: initialData.title,
            customerCompanyName: initialData.customerCompanyName || "",
            customerDisplayName: initialData.customerDisplayName || "",
            notes: initialData.notes || "",
            validUntil: initialData.validUntil || "07_Days",
            currency: initialData.currency || "INR",
            exchangeRate: initialData.exchangeRate ?? 83.50,
            placeOfSupply: initialData.placeOfSupply || "",
        } : {
            customerId: "",
            title: "",
            customerCompanyName: "",
            customerDisplayName: "",
            notes: "",
            validUntil: "07_Days",
            currency: "INR",
            exchangeRate: 83.50,
            placeOfSupply: "",
        }
    });

    const watchedCurrency = useWatch({ control: form.control, name: "currency" });

    const handleFetchRate = async () => {
        setFetchingRate(true);
        try {
            const res = await getLiveExchangeRate("USD", "INR");
            if (res.success && res.data) {
                form.setValue("exchangeRate", res.data.rate, { shouldValidate: true });
                toast.success(`Exchange rate updated: ₹${res.data.rate} / USD (${res.data.source})`);
            } else {
                toast.error(res.message || "Failed to fetch exchange rate");
            }
        } catch {
            toast.error("Failed to fetch the latest exchange rate. Try again.");
        } finally {
            setFetchingRate(false);
        }
    };
    const {
        formState: { isSubmitting },
    } = form;

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
        <div className="w-full space-y-6 pb-24">
            <ProposalWorkflowNav
                proposalId={initialData?.id}
                activeStep={1}
                title={initialData?.title}
                customerName={initialData?.customerDisplayName}
                status={initialData ? "DRAFT" : null}
                maxAvailableStep={1}
            />
            <form id="proposal-details-form" onSubmit={handleSubmit} className="w-full space-y-8">
                <section aria-labelledby="proposal-details-heading" className="space-y-5">
                    <div className="max-w-3xl">
                        <h2 id="proposal-details-heading" className="text-base font-semibold">Proposal details</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose who this proposal is for. Adding a title is optional.
                        </p>
                    </div>
                    <FieldGroup className="grid gap-5 md:grid-cols-2">
                <Controller
                    name="customerId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="min-w-0 gap-2"
                        >
                            <FieldLabel htmlFor="customerId">Customer <span className="text-destructive">*</span></FieldLabel>
                            <div className="flex min-w-0 gap-2">
                                <div className="min-w-0 flex-1">
                                    <CustomerCombobox
                                        id="customerId"
                                        aria-invalid={fieldState.invalid}
                                        value={field.value}
                                        selectedCustomer={selectedCustomer}
                                        onCreateCustomer={() => setCreateCustomerOpen(true)}
                                        onValueChange={(customer) => {
                                            setSelectedCustomer(customer);
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
                                </div>
                                {field.value && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        aria-label="Clear selected customer"
                                        onClick={() => {
                                            setSelectedCustomer(null);
                                            field.onChange("");
                                            form.setValue("customerDisplayName", "", { shouldValidate: true, shouldDirty: true });
                                            form.setValue("customerCompanyName", "", { shouldValidate: true, shouldDirty: true });
                                        }}
                                    >
                                        <XIcon />
                                    </Button>
                                )}
                            </div>
                            <FieldDescription>Search for an existing customer or add a new one.</FieldDescription>
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
                            className="gap-2"
                        >
                            <FieldLabel htmlFor="title">Proposal title <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                            <Input
                                {...field}
                                id="title"
                                type="text"
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. Website redesign proposal"
                            />
                            <FieldDescription>Add a title to identify this proposal. Leave it blank to use the document&apos;s default heading.</FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
                    </FieldGroup>
                </section>

                <section aria-labelledby="commercial-terms-heading" className="space-y-5 border-t pt-6">
                    <div className="max-w-3xl">
                        <h2 id="commercial-terms-heading" className="text-base font-semibold">Commercial terms</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Set how long the offer is valid and which currency to use for pricing.
                        </p>
                    </div>
                    <FieldGroup className="grid gap-5 md:grid-cols-2">
                <Controller
                    control={form.control}
                    name="validUntil"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-2">
                            <FieldLabel htmlFor="validUntil">Proposal validity</FieldLabel>

                            <FieldContent>
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <SelectTrigger id="validUntil" className="w-full">
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
                                    The offer expires after this many days.
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
                    control={form.control}
                    name="currency"
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-2">
                            <FieldLabel>Currency</FieldLabel>

                            <FieldContent>
                                <Select
                                    value={field.value}
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        if (val === "USD") {
                                            handleFetchRate();
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="INR">
                                            INR (₹)
                                        </SelectItem>

                                        <SelectItem value="USD">
                                            USD ($)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <FieldDescription>
                                    Pricing and totals will use this currency.
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

                {watchedCurrency === "USD" && (
                    <>
                        <Controller
                            name="exchangeRate"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-2">
                                    <div className="flex items-center justify-between">
                                        <FieldLabel htmlFor="exchangeRate">INR to USD exchange rate</FieldLabel>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleFetchRate}
                                            disabled={fetchingRate}
                                            className="h-7 gap-1 px-2 text-xs"
                                        >
                                            {fetchingRate ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <RefreshCwIcon className="h-3 w-3" />}
                                            Fetch Today&apos;s Rate
                                        </Button>
                                    </div>
                                    <Input
                                        id="exchangeRate"
                                        type="number"
                                        step="any"
                                        min="0.0001"
                                        value={field.value ?? 83.50}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        aria-invalid={fieldState.invalid}
                                    />
                                    <FieldDescription>Rupees per US dollar. You can adjust the fetched rate.</FieldDescription>
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />

                        <Controller
                            name="placeOfSupply"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid} className="gap-2">
                                    <FieldLabel htmlFor="placeOfSupply">Place of Supply (Country)</FieldLabel>
                                    <Input
                                        id="placeOfSupply"
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        aria-invalid={fieldState.invalid}
                                        placeholder="e.g. United States"
                                    />
                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                </Field>
                            )}
                        />
                    </>
                )}
                    </FieldGroup>
                </section>

                <section aria-labelledby="notes-heading" className="space-y-5 border-t pt-6">
                    <div className="max-w-3xl">
                        <h2 id="notes-heading" className="text-base font-semibold">Cover page message</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                        This message appears on the proposal cover, so write it for your customer.
                        </p>
                    </div>
                    <FieldGroup className="grid gap-5 md:grid-cols-2">
                <Controller
                    name="notes"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field
                            data-invalid={fieldState.invalid}
                            className="gap-2 md:col-span-2"
                        >
                            <FieldLabel htmlFor="notes">Introduction</FieldLabel>
                            <Textarea
                                {...field}
                                id="notes"
                                maxLength={200}
                                aria-invalid={fieldState.invalid}
                                placeholder="Briefly introduce the proposal and what it offers."
                                rows={3}
                            />
                            <FieldDescription className="text-right">{(field.value || "").length}/200</FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
                    </FieldGroup>
                </section>

            </form>
            <ProposalWorkflowActionBar>
                <Button type="submit" form="proposal-details-form" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? (
                        <>
                            <Loader2Icon className="mr-2 size-4 animate-spin" />
                            Saving draft…
                        </>
                    ) : initialData ? "Save details and continue" : "Save draft and continue"}
                </Button>
            </ProposalWorkflowActionBar>
            <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
            <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[530px] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-h-[94dvh]">
                <DialogHeader className="shrink-0 border-b bg-background px-4 py-3 sm:px-5 sm:py-4">
                    <DialogTitle>New Customer</DialogTitle>
                </DialogHeader>
                <CustomerForm
                    presentation="dialog"
                    onCreated={(customer) => {
                        setSelectedCustomer(customer);
                        form.setValue("customerId", customer.id, { shouldValidate: true, shouldDirty: true });
                        form.setValue("customerDisplayName", customer.displayName, { shouldValidate: true, shouldDirty: true });
                        form.setValue("customerCompanyName", customer.companyName ?? "", { shouldValidate: true, shouldDirty: true });
                        setCreateCustomerOpen(false);
                    }}
                    onCancel={() => setCreateCustomerOpen(false)}
                />
            </DialogContent>
            </Dialog>
        </div>
    );
}
