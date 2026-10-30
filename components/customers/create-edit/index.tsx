"use client";
import * as React from "react";
import { CustomerSchema, CustomerSchemaInput, customerSchema } from "@/lib/schemas/customer-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, UseFormReturn } from "react-hook-form";
import { ArrowLeft, Copy, Info } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CustomerType } from "@/app/generated/prisma/enums";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CreateCustomer, UpdateCustomer } from "@/actions/customer";
import { useRouter } from "next/navigation";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { PhoneInput } from "@/components/reui/phone-input";
import { Customer } from "@/app/generated/prisma/client";
import type { CustomerOption } from "@/components/customers/customer-combobox";
import { customerDocumentsSchema } from "@/lib/schemas/customer-schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { AssetUpload } from "@/components/ui/asset-upload";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";

function isCustomerOption(value: unknown): value is CustomerOption {
    if (!value || typeof value !== "object") return false;
    return (
        "id" in value
        && typeof value.id === "string"
        && "customerNumber" in value
        && typeof value.customerNumber === "number"
        && "displayName" in value
        && typeof value.displayName === "string"
        && "companyName" in value
        && (typeof value.companyName === "string" || value.companyName === null)
        && "primaryContactName" in value
        && (typeof value.primaryContactName === "string" || value.primaryContactName === null)
    );
}

function getDisplayNameOptions(contactName: string, companyName: string) {
    const contact = contactName.trim().replace(/\s+/g, " ");
    const company = companyName.trim().replace(/\s+/g, " ");
    const nameParts = contact.split(" ").filter(Boolean);
    const reversedName = nameParts.length > 1
        ? `${nameParts.at(-1)}, ${nameParts.slice(0, -1).join(" ")}`
        : "";

    return [...new Set([contact, reversedName, company].filter(Boolean))];
}

function DisplayNameCombobox({
    value,
    options,
    id,
    className,
    inputClassName,
    placeholder,
    invalid,
    onChange,
    onUserInput,
}: {
    value: string;
    options: string[];
    id: string;
    className: string;
    inputClassName: string;
    placeholder: string;
    invalid?: boolean;
    onChange: (value: string) => void;
    onUserInput: () => void;
}) {
    return (
        <Combobox
            items={options}
            value={value}
            inputValue={value}
            onValueChange={(nextValue) => {
                if (typeof nextValue === "string") onChange(nextValue);
            }}
            onInputValueChange={onChange}
            itemToStringLabel={(option) => option}
            itemToStringValue={(option) => option}
        >
            <ComboboxInput
                className={className}
                id={id}
                placeholder={placeholder}
                aria-invalid={invalid}
                onChange={onUserInput}
                showTrigger
                showClear={false}
                render={<Input className={inputClassName} />}
            />
            <ComboboxContent className="bg-popover">
                <ComboboxEmpty>
                    Type a display name, or choose one of the suggestions.
                </ComboboxEmpty>
                <ComboboxList>
                    {(option) => (
                        <ComboboxItem key={option} value={option}>
                            {option}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

type CustomerFormProps = {
    defaultValues?: Customer | null;
    error?: string;
    onCreated?: (customer: CustomerOption) => void;
    onCancel?: () => void;
    presentation?: "page" | "dialog";
};

export function CustomerForm({
    defaultValues,
    error,
    onCreated,
    onCancel,
    presentation = "page",
}: CustomerFormProps) {
    const router = useRouter();
    const customerDocuments = customerDocumentsSchema.safeParse(defaultValues?.documents).data ?? [];
    const savedGstTreatment = customerSchema.shape.gstTreatment.safeParse(defaultValues?.gstTreatment).data;
    const savedTaxPreference = customerSchema.shape.taxPreference.safeParse(defaultValues?.taxPreference).data ?? "TAXABLE";
    const savedPaymentTerms = customerSchema.shape.paymentTerms.safeParse(defaultValues?.paymentTerms).data ?? "DUE_ON_RECEIPT";
    const [activeDialogTab, setActiveDialogTab] = React.useState("other-details");
    const initialContactNames = (defaultValues?.primaryContactName ?? "").trim().split(/\s+/).filter(Boolean);
    const [contactFirstName, setContactFirstName] = React.useState(initialContactNames[0] ?? "");
    const [contactLastName, setContactLastName] = React.useState(initialContactNames.slice(1).join(" "));
    const initialPhone = defaultValues?.primaryContactPhone ?? "";
    const phoneCodeMatch = initialPhone.match(/^\+\d{1,3}/);
    const [phoneCode, setPhoneCode] = React.useState(phoneCodeMatch?.[0] ?? "+91");
    const [phoneNumber, setPhoneNumber] = React.useState(
        phoneCodeMatch ? initialPhone.slice(phoneCodeMatch[0].length) : initialPhone.replace(/^\+/, "")
    );
    const displayNameWasManuallyEdited = React.useRef(false);
    const previousGeneratedDisplayName = React.useRef("");

    const form = useForm<CustomerSchemaInput, unknown, CustomerSchema>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            id: defaultValues?.id,

            displayName: defaultValues?.displayName || "",
            companyName: defaultValues?.companyName || "",

            primaryContactSalutation: defaultValues?.primaryContactSalutation || "",
            primaryContactName: defaultValues?.primaryContactName || "",
            primaryContactEmail: defaultValues?.primaryContactEmail || "",
            primaryContactPhone: defaultValues?.primaryContactPhone || "",
            currency: defaultValues?.currency || "INR",
            customerLanguage: defaultValues?.customerLanguage || "English",
            gstTreatment: savedGstTreatment,
            placeOfSupply: defaultValues?.placeOfSupply || "",
            taxPreference: savedTaxPreference,
            paymentTerms: savedPaymentTerms,
            portalEnabled: defaultValues?.portalEnabled || false,
            documents: customerDocuments,
            customerNumber: defaultValues?.customerNumber,

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
    const watchedCompanyName = form.watch("companyName") ?? "";
    const watchedContactName = form.watch("primaryContactName") ?? "";
    const displayNameContact = presentation === "dialog"
        ? [contactFirstName, contactLastName].filter(Boolean).join(" ")
        : watchedContactName;
    const displayNameOptions = React.useMemo(
        () => getDisplayNameOptions(displayNameContact, watchedCompanyName),
        [displayNameContact, watchedCompanyName]
    );
    const autoDisplayName = form.watch("customerType") === CustomerType.INDIVIDUAL
        ? displayNameOptions.find((option) => option === displayNameContact.trim()) ?? displayNameOptions[0] ?? ""
        : watchedCompanyName.trim() || displayNameOptions[0] || "";

    React.useEffect(() => {
        if (defaultValues?.id || displayNameWasManuallyEdited.current) return;

        const currentDisplayName = form.getValues("displayName");
        if (!currentDisplayName || currentDisplayName === previousGeneratedDisplayName.current) {
            form.setValue("displayName", autoDisplayName, { shouldValidate: true });
        }
        previousGeneratedDisplayName.current = autoDisplayName;
    }, [autoDisplayName, defaultValues?.id, form]);

    const { mutate, isPending } = useMutation({
        mutationFn: defaultValues?.id ? UpdateCustomer : CreateCustomer,
        onSuccess: (ctx) => {
            if (!ctx.success) {
                toast.error(ctx.message);
                return;
            }

            if (onCreated) {
                if ("customer" in ctx && isCustomerOption(ctx.customer)) {
                    onCreated(ctx.customer);
                    toast.success(ctx.message)
                    displayNameWasManuallyEdited.current = false;
                    previousGeneratedDisplayName.current = "";
                    form.reset();
                    return;
                }

                toast.error("Customer was created, but could not be selected.");
                return;
            }
            toast.success(ctx.message)
            if (defaultValues?.id) form.reset();
            router.push("/dashboard/customers")
        },
        onError: (ctx) => {
            toast.error(ctx.message)
        }
    })

    function copyAddressToBilling(
        form: UseFormReturn<CustomerSchemaInput, unknown, CustomerSchema>
    ) {
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

    if (presentation === "dialog") {
        const detailsClass = "h-8 w-full min-w-0 rounded border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
        const rowClass = "grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5";
        const fieldLabelClass = "flex items-center gap-1 text-[10px] font-normal text-foreground";
        const requiredMark = <span className="text-destructive">*</span>;
        const infoTip = (text: string) => (
            <Tooltip>
                <TooltipTrigger type="button" aria-label="More information" className="text-muted-foreground">
                    <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent>{text}</TooltipContent>
            </Tooltip>
        );
        const documents = form.watch("documents") ?? [];

        return (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-3.5 sm:px-4">
                    {error && (
                        <div role="alert" className="rounded border border-destructive/40 bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
                            {error}
                        </div>
                    )}

                    <div className={rowClass}>
                        <Label className={fieldLabelClass}>
                            Customer Type {infoTip("Choose whether this customer is a business or an individual.")}
                        </Label>
                        <Controller
                            name="customerType"
                            control={form.control}
                            render={({ field }) => (
                                <div className="flex h-8 items-center gap-4 text-xs">
                                    {[
                                        [CustomerType.BUSINESS, "Business"],
                                        [CustomerType.INDIVIDUAL, "Individual"],
                                    ].map(([value, label]) => (
                                        <label key={value} className="flex items-center gap-1.5">
                                            <input
                                                type="radio"
                                                name={field.name}
                                                value={value}
                                                checked={field.value === value}
                                                onChange={() => field.onChange(value)}
                                                className="size-3 accent-primary"
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        />
                    </div>

                    <div className={rowClass}>
                        <Label className={fieldLabelClass}>
                            Primary Contact {infoTip("Main contact for this customer.")}
                        </Label>
                        <div className="grid min-w-0 grid-cols-[0.9fr_1fr_1fr] gap-1.5">
                            <select
                                aria-label="Salutation"
                                className={detailsClass}
                                {...form.register("primaryContactSalutation")}
                            >
                                <option value="">Salutation</option>
                                {["Mr.", "Mrs.", "Ms.", "Dr."].map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                            <Input
                                aria-label="First name"
                                placeholder="First Name"
                                value={contactFirstName}
                                className={detailsClass}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    setContactFirstName(next);
                                    form.setValue("primaryContactName", [next, contactLastName].filter(Boolean).join(" "), { shouldValidate: true });
                                }}
                            />
                            <Input
                                aria-label="Last name"
                                placeholder="Last Name"
                                value={contactLastName}
                                className={detailsClass}
                                onChange={(event) => {
                                    const next = event.target.value;
                                    setContactLastName(next);
                                    form.setValue("primaryContactName", [contactFirstName, next].filter(Boolean).join(" "), { shouldValidate: true });
                                }}
                            />
                        </div>
                    </div>

                    <div className={rowClass}>
                        <Label htmlFor="dialog-company-name" className={fieldLabelClass}>Company Name</Label>
                        <Input id="dialog-company-name" placeholder="Company Name" className={detailsClass} {...form.register("companyName")} />
                    </div>

                    <div className={rowClass}>
                        <Label htmlFor="dialog-display-name" className={fieldLabelClass}>
                            Display Name{requiredMark} {infoTip("This name appears in invoices, proposals, and customer lists.")}
                        </Label>
                        <div>
                            <DisplayNameCombobox
                                value={form.watch("displayName") ?? ""}
                                options={displayNameOptions}
                                placeholder="Select or type to add"
                                id="dialog-display-name"
                                className={detailsClass}
                                inputClassName="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2 text-xs text-foreground shadow-none outline-none focus-visible:border-0 focus-visible:ring-0"
                                invalid={Boolean(form.formState.errors.displayName)}
                                onChange={(value) => form.setValue("displayName", value, { shouldValidate: true })}
                                onUserInput={() => {
                                    displayNameWasManuallyEdited.current = true;
                                }}
                            />
                            {form.formState.errors.displayName && (
                                <p role="alert" className="mt-1 text-[10px] text-destructive">{form.formState.errors.displayName.message}</p>
                            )}
                        </div>
                    </div>

                    <div className={rowClass}>
                        <Label htmlFor="dialog-currency" className={fieldLabelClass}>Currency</Label>
                        <div>
                            <select id="dialog-currency" className={detailsClass} {...form.register("currency")}>
                                <option value="INR">INR - Indian Rupee</option>
                                <option value="USD">USD - US Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="GBP">GBP - British Pound</option>
                            </select>
                            <p className="mt-1 text-[9px] leading-3 text-muted-foreground">
                                Currency cannot be changed after transactions are recorded.
                            </p>
                        </div>
                    </div>

                    <div className={rowClass}>
                        <Label htmlFor="dialog-email" className={fieldLabelClass}>Email Address {infoTip("Used for customer correspondence.")}</Label>
                        <Input id="dialog-email" type="email" placeholder="Email Address" className={detailsClass} {...form.register("primaryContactEmail")} />
                    </div>

                    <div className={rowClass}>
                        <Label className={fieldLabelClass}>
                            Customer Number{requiredMark} {infoTip("Generated automatically when the customer is saved.")}
                        </Label>
                        <Input
                            readOnly
                            aria-label="Customer number"
                            value={defaultValues?.customerNumber ? `CUS-${String(defaultValues.customerNumber).padStart(5, "0")}` : "Assigned when saved"}
                            className={`${detailsClass} bg-muted/50`}
                        />
                    </div>

                    <div className={rowClass}>
                        <Label htmlFor="dialog-phone" className={fieldLabelClass}>Phone {infoTip("Enter a phone number with its country code.")}</Label>
                        <div className="grid min-w-0 grid-cols-[5.25rem_minmax(0,1fr)] gap-1.5">
                            <select
                                aria-label="Phone country code"
                                className={detailsClass}
                                value={phoneCode}
                                onChange={(event) => {
                                    const code = event.target.value;
                                    setPhoneCode(code);
                                    form.setValue("primaryContactPhone", phoneNumber ? `${code}${phoneNumber.replace(/\D/g, "")}` : "", { shouldValidate: true });
                                }}
                            >
                                <option value="+91">+91</option>
                                <option value="+1">+1</option>
                                <option value="+44">+44</option>
                                <option value="+61">+61</option>
                            </select>
                            <Input
                                id="dialog-phone"
                                type="tel"
                                placeholder="Work Phone"
                                value={phoneNumber}
                                className={detailsClass}
                                onChange={(event) => {
                                    const number = event.target.value;
                                    setPhoneNumber(number);
                                    form.setValue("primaryContactPhone", number ? `${phoneCode}${number.replace(/\D/g, "")}` : "", { shouldValidate: true });
                                }}
                            />
                        </div>
                        {form.formState.errors.primaryContactPhone && (
                            <p role="alert" className="col-start-2 text-[10px] text-destructive">{form.formState.errors.primaryContactPhone.message}</p>
                        )}
                    </div>

                    <div className={rowClass}>
                        <Label htmlFor="dialog-language" className={fieldLabelClass}>Customer Language {infoTip("Preferred language for customer communications.")}</Label>
                        <select id="dialog-language" className={detailsClass} {...form.register("customerLanguage")}>
                            {["English", "Tamil", "Hindi", "Malayalam", "Telugu", "Kannada"].map((language) => <option key={language} value={language}>{language}</option>)}
                        </select>
                    </div>

                    <Tabs value={activeDialogTab} onValueChange={setActiveDialogTab} className="mt-3 min-h-0">
                        <TabsList variant="line" className="h-8 w-full justify-start gap-2 overflow-x-auto rounded-none border-b p-0">
                            <TabsTrigger value="other-details" className="flex-none px-2 text-[10px]">Other Details</TabsTrigger>
                            <TabsTrigger value="address" className="flex-none px-2 text-[10px]">Address</TabsTrigger>
                            <TabsTrigger value="custom-fields" className="flex-none px-2 text-[10px]">Custom Fields</TabsTrigger>
                            <TabsTrigger value="remarks" className="flex-none px-2 text-[10px]">Remarks</TabsTrigger>
                        </TabsList>

                        <TabsContent value="other-details" className="mt-3 space-y-2.5">
                            <div className={rowClass}>
                                <Label htmlFor="dialog-gst-treatment" className={fieldLabelClass}>GST Treatment{requiredMark}</Label>
                                <select id="dialog-gst-treatment" className={detailsClass} {...form.register("gstTreatment")}>
                                    <option value="">Select a GST treatment</option>
                                    {[
                                        ["REGISTERED_REGULAR", "Registered Business - Regular"],
                                        ["REGISTERED_COMPOSITION", "Registered Business - Composition"],
                                        ["UNREGISTERED", "Unregistered Business"],
                                        ["CONSUMER", "Consumer"],
                                        ["OVERSEAS", "Overseas"],
                                        ["SEZ", "Special Economic Zone"],
                                    ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <div className={rowClass}>
                                <Label htmlFor="dialog-place-of-supply" className={fieldLabelClass}>Place of Supply{requiredMark}</Label>
                                <select id="dialog-place-of-supply" className={detailsClass} {...form.register("placeOfSupply")}>
                                    <option value="">Select a state</option>
                                    {[
                                        ["AN", "Andaman and Nicobar Islands"], ["AP", "Andhra Pradesh"], ["AR", "Arunachal Pradesh"],
                                        ["AS", "Assam"], ["BR", "Bihar"], ["CH", "Chandigarh"], ["CG", "Chhattisgarh"],
                                        ["DL", "Delhi"], ["GA", "Goa"], ["GJ", "Gujarat"], ["HR", "Haryana"],
                                        ["HP", "Himachal Pradesh"], ["JK", "Jammu and Kashmir"], ["JH", "Jharkhand"],
                                        ["KA", "Karnataka"], ["KL", "Kerala"], ["MP", "Madhya Pradesh"],
                                        ["MH", "Maharashtra"], ["OD", "Odisha"], ["PY", "Puducherry"],
                                        ["PB", "Punjab"], ["RJ", "Rajasthan"], ["TN", "Tamil Nadu"],
                                        ["TS", "Telangana"], ["UP", "Uttar Pradesh"], ["UK", "Uttarakhand"],
                                        ["WB", "West Bengal"],
                                    ].map(([code, name]) => <option key={code} value={code}>[{code}] - {name}</option>)}
                                </select>
                            </div>
                            <div className={rowClass}>
                                <Label htmlFor="dialog-pan" className={fieldLabelClass}>PAN {infoTip("Permanent Account Number.")}</Label>
                                <Input id="dialog-pan" placeholder="PAN" className={detailsClass} {...form.register("panNumber")} />
                            </div>
                            <div className={rowClass}>
                                <Label className={fieldLabelClass}>Tax Preference{requiredMark}</Label>
                                <Controller
                                    name="taxPreference"
                                    control={form.control}
                                    render={({ field }) => (
                                        <div className="flex h-8 items-center gap-4 text-xs">
                                            {[
                                                ["TAXABLE", "Taxable"],
                                                ["TAX_EXEMPT", "Tax Exempt"],
                                            ].map(([value, label]) => (
                                                <label key={value} className="flex items-center gap-1.5">
                                                    <input
                                                        type="radio"
                                                        name={field.name}
                                                        value={value}
                                                        checked={field.value === value}
                                                        onChange={() => field.onChange(value)}
                                                        className="size-3 accent-primary"
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                />
                            </div>
                            <div className={rowClass}>
                                <Label htmlFor="dialog-payment-terms" className={fieldLabelClass}>Payment Terms</Label>
                                <select id="dialog-payment-terms" className={detailsClass} {...form.register("paymentTerms")}>
                                    {[
                                        ["DUE_ON_RECEIPT", "Due on Receipt"],
                                        ["NET_15", "Net 15"],
                                        ["NET_30", "Net 30"],
                                        ["NET_45", "Net 45"],
                                        ["NET_60", "Net 60"],
                                    ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </select>
                            </div>
                            <div className={rowClass}>
                                <Label htmlFor="dialog-portal" className={fieldLabelClass}>Enable Portal? {infoTip("Allow this customer to access the customer portal.")}</Label>
                                <label className="flex h-8 items-center gap-2 text-[10px]">
                                    <Checkbox
                                        id="dialog-portal"
                                        checked={form.watch("portalEnabled")}
                                        onCheckedChange={(checked) => form.setValue("portalEnabled", checked === true)}
                                    />
                                    Allow portal access for this customer
                                </label>
                            </div>
                            <div className={rowClass}>
                                <Label className={fieldLabelClass}>Documents</Label>
                                <AssetUpload
                                    scope="customer"
                                    value={documents}
                                    onChange={(nextDocuments) => form.setValue("documents", nextDocuments)}
                                    multiple
                                    maxFiles={3}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="address" className="mt-3 space-y-2.5">
                            {([
                                ["addressLine1", "Address"],
                                ["addressLine2", "Address line 2"],
                                ["city", "City"],
                                ["state", "State / Province"],
                                ["country", "Country"],
                                ["postalCode", "Postal Code"],
                            ] as const).map(([name, label]) => (
                                <div className={rowClass} key={name}>
                                    <Label htmlFor={`dialog-${name}`} className={fieldLabelClass}>{label}</Label>
                                    <Input id={`dialog-${name}`} className={detailsClass} {...form.register(name)} />
                                </div>
                            ))}
                        </TabsContent>

                        <TabsContent value="custom-fields" className="mt-3">
                            <p className="py-4 text-center text-xs text-muted-foreground">
                                No custom fields have been configured.
                            </p>
                        </TabsContent>

                        <TabsContent value="remarks" className="mt-3 space-y-2">
                            <Label htmlFor="dialog-internal-notes" className={fieldLabelClass}>Remarks</Label>
                            <Textarea id="dialog-internal-notes" rows={4} className="min-h-20 text-xs" {...form.register("internalNotes")} />
                        </TabsContent>
                    </Tabs>
                    <p className="pt-1 text-[9px] leading-4 text-muted-foreground">
                        <span className="font-medium text-foreground">Customer Owner:</span> Customer access follows your workspace permissions.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 border-t bg-background px-3 py-3 sm:px-4">
                    <Button type="submit" size="sm" disabled={isPending}>
                        {isPending ? "Saving…" : "Save"}
                    </Button>
                    {onCancel && (
                        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                </div>
            </form>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mx-auto"
        >
            {presentation === "page" && (
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
            )}
            {error && (
                <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            )}
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
                            <DisplayNameCombobox
                                value={field.value ?? ""}
                                options={displayNameOptions}
                                id="displayName"
                                className="h-9 w-full"
                                inputClassName="h-9 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 py-1 text-base shadow-none outline-none focus-visible:border-0 focus-visible:ring-0 md:text-sm"
                                placeholder="Enter display name"
                                invalid={fieldState.invalid}
                                onChange={field.onChange}
                                onUserInput={() => {
                                    displayNameWasManuallyEdited.current = true;
                                }}
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
            <div className="flex items-center justify-end gap-2 border-t pt-4">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                )}
                <Button disabled={isPending}>
                    {isPending ? defaultValues?.id ? "Updating..." : "Creating..." : defaultValues?.id ? "Update Customer" : "Create Customer"}
                </Button>
            </div>
        </form>
    );
}
