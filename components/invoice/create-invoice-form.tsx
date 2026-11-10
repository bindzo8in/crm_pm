"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInvoice, updateInvoice, getCompanyBankAccounts, getInvoiceById } from "@/actions/invoice";
import { CanCreateBankAccount } from "@/actions/bank-accounts";
import { getLiveExchangeRate } from "@/actions/exchange-rate";
import { toast } from "sonner";
import { ServicePackageSearch, ServicePackageSearchResult } from "@/components/invoice/service-package-search";
import { InvoiceServiceAutocomplete } from "@/components/invoice/invoice-service-autocomplete";
import { CustomerForm } from "@/components/customers/create-edit";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { BankAccountForm } from "@/components/settings/bank-account-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, Trash2Icon, ArrowLeftIcon, SaveIcon, Loader2Icon, RefreshCwIcon, XIcon, GripVerticalIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import Link from "next/link";
import {
  BillingCycleEnum,
  InvoiceFormInput,
  InvoiceFormValues,
  invoiceFormSchema,
} from "@/lib/schemas/invoice-schema";
import { formatInIST, shiftDateOnly } from "@/lib/date";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSidebar } from "@/components/ui/sidebar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type InvoiceInitialData = NonNullable<
  Extract<Awaited<ReturnType<typeof getInvoiceById>>, { success: true }>["data"]
>;

const PAYMENT_TERMS = [
  { label: "Due on receipt", days: 0 },
  { label: "Net 7 days", days: 7 },
  { label: "Net 15 days", days: 15 },
  { label: "Net 30 days", days: 30 },
  { label: "Net 45 days", days: 45 },
  { label: "Net 60 days", days: 60 },
] as const;

function getDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  return value instanceof Date ? formatInIST(value, "yyyy-MM-dd") : value;
}

function getPaymentTerm(value: string | null | undefined) {
  return PAYMENT_TERMS.find(
    ({ label }) => label.toLowerCase() === value?.toLowerCase(),
  );
}

function SortableInvoiceLineItem({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-stretch gap-2 ${
        isDragging ? "relative z-10 opacity-60" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder line item ${index + 1}`}
        title="Drag to reorder"
        className="mt-1 flex h-10 touch-none items-center justify-center self-start rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVerticalIcon aria-hidden="true" className="size-4" />
      </button>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function CreateInvoiceForm({
  initialData,
  today,
}: {
  initialData?: InvoiceInitialData;
  today: string;
}) {
  const router = useRouter();
  const { isMobile, state: sidebarState } = useSidebar();
  const [isTablet, setIsTablet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createBankAccountOpen, setCreateBankAccountOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(() => (
    initialData?.customerId
      ? {
          id: initialData.customerId,
          customerNumber: 0,
          displayName: initialData.customerDisplayName,
          companyName: initialData.customerCompanyName,
          primaryContactName: null,
        }
      : null
  ));
  const [currencyConfirmationOpen, setCurrencyConfirmationOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; accountName: string; bankName: string; isDefault: boolean }>>([]);
  const [canCreateBankAccount, setCanCreateBankAccount] = useState(false);

  const form = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: initialData?.customerId || "",
      currency: initialData?.currency || "INR",
      exchangeRate: initialData?.exchangeRate || 83.5,
      placeOfSupply: initialData?.placeOfSupply || "",
      issueDate: initialData?.issueDate
        ? formatInIST(new Date(initialData.issueDate), "yyyy-MM-dd")
        : today,
      dueDate: initialData?.dueDate
        ? formatInIST(new Date(initialData.dueDate), "yyyy-MM-dd")
        : initialData ? null : today,
      notes: initialData?.notes ?? "Thanks for your business.",
      terms: initialData?.terms ?? "Due on Receipt",
      bankAccountId: initialData?.bankAccountId || "",
      discount: initialData?.discount || 0,
      lineItems: initialData?.lineItems && initialData.lineItems.length > 0
        ? initialData.lineItems.map((item) => ({
          id: item.id,
          servicePackageId: item.servicePackageId || null,
          serviceName: item.servicePackage?.service?.name || item.servicePackage?.name || null,
          name: item.name,
          description: item.description || "",
          quantity: item.quantity,
          unit: item.unit || "item",
          unitPrice: item.unitPrice,
          taxRate: initialData.currency === "USD" ? 0 : item.taxRate || 18,
          sacCode: item.sacCode || "9983",
          billingCycle: item.billingCycle || "ONE_TIME",
        }))
        : [{
          name: "",
          description: "",
          quantity: 1,
          unit: "item",
          unitPrice: 0,
          taxRate: 18,
          sacCode: "9983",
          billingCycle: "ONE_TIME",
        }],
    },
  });
  const { fields, append, remove, replace, move } = useFieldArray({
    control: form.control,
    name: "lineItems",
    keyName: "formId",
  });
  const currency = useWatch({ control: form.control, name: "currency" }) || "INR";
  const exchangeRate = useWatch({ control: form.control, name: "exchangeRate" }) || 83.5;
  const placeOfSupply = useWatch({ control: form.control, name: "placeOfSupply" }) || "";
  const customerId = useWatch({ control: form.control, name: "customerId" }) || "";
  const discount = useWatch({ control: form.control, name: "discount" }) || 0;
  const dueDate = useWatch({ control: form.control, name: "dueDate" });
  const lineItems = useWatch({ control: form.control, name: "lineItems" }) || [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const tabletQuery = window.matchMedia("(min-width: 768px) and (max-width: 1023px)");
    const syncTablet = () => setIsTablet(tabletQuery.matches);
    syncTablet();
    tabletQuery.addEventListener("change", syncTablet);
    return () => tabletQuery.removeEventListener("change", syncTablet);
  }, []);

  useEffect(() => {
    async function loadData() {
      const [bankRes, canCreate] = await Promise.all([
        getCompanyBankAccounts(),
        CanCreateBankAccount(),
      ]);
      setCanCreateBankAccount(canCreate);
      if (bankRes.success && bankRes.data) {
        setBankAccounts(bankRes.data);
        if (!initialData?.bankAccountId && bankRes.data.length > 0) {
          const defaultAccount = bankRes.data.find((b) => b.isDefault) || bankRes.data[0];
          if (defaultAccount) {
            form.setValue("bankAccountId", defaultAccount.id, { shouldDirty: true });
          }
        }
      }
    }
    loadData();
  }, [form, initialData?.bankAccountId]);

  const reloadBankAccounts = async () => {
    const bankRes = await getCompanyBankAccounts();
    if (!bankRes.success) {
      toast.error(bankRes.message || "Unable to reload bank accounts.");
      return;
    }
    const accounts = bankRes.data ?? [];
    setBankAccounts(accounts);
    return accounts;
  };

  const handleFetchRate = async () => {
    setFetchingRate(true);
    const res = await getLiveExchangeRate("USD", "INR");
    setFetchingRate(false);
    if (res.success && res.data) {
      form.setValue("exchangeRate", res.data.rate, { shouldDirty: true });
      toast.success(`Rate updated: ₹${res.data.rate} / USD (${res.data.source})`);
    } else {
      toast.error("Failed to fetch live exchange rate");
    }
  };

  const handleAddPackage = (pkg: ServicePackageSearchResult) => {
    const newItems = pkg.items.map((item) => {
      const inrPrice = item.unitPrice;
      const usdPrice = item.unitPriceUSD && item.unitPriceUSD > 0
        ? item.unitPriceUSD
        : Number((item.unitPrice / (exchangeRate || 83.5)).toFixed(2));
      const priceToUse = currency === "USD" ? usdPrice : inrPrice;

      return {
        servicePackageId: pkg.id,
        serviceName: pkg.serviceName || null,
        name: item.name && item.name.toLowerCase() !== "package" ? item.name : (pkg.serviceName ? `${pkg.serviceName} - ${pkg.name}` : pkg.name),
        description: item.description || pkg.description || "",
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: priceToUse,
        taxRate: currency === "USD" ? 0 : 18,
        sacCode: item.sacCode || pkg.sacCode || "9983",
        billingCycle: item.billingCycle,
      };
    });

    if (lineItems.length === 1 && !lineItems[0].name.trim()) {
      replace(newItems);
    } else {
      newItems.forEach((item) => append(item));
    }
  };

  const handleAddLineItem = () => {
    append({
      name: "",
      description: "",
      quantity: 1,
      unit: "item",
      unitPrice: 0,
      taxRate: currency === "USD" ? 0 : 18,
      sacCode: "9983",
      billingCycle: "ONE_TIME",
    });
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    remove(index);
  };

  const handleSelectService = (
    index: number,
    servicePackage: ServicePackageSearchResult,
    item: ServicePackageSearchResult["items"][number],
  ) => {
    const unitPrice = currency === "USD"
      ? item.unitPriceUSD > 0
        ? item.unitPriceUSD
        : Number((item.unitPrice / (exchangeRate || 83.5)).toFixed(2))
      : item.unitPrice;
    const name = item.name.toLowerCase() !== "package"
      ? item.name
      : `${servicePackage.serviceName} - ${servicePackage.name}`;
    const options = { shouldDirty: true };

    form.setValue(`lineItems.${index}.servicePackageId`, servicePackage.id, options);
    form.setValue(`lineItems.${index}.serviceName`, servicePackage.serviceName, options);
    form.setValue(`lineItems.${index}.name`, name, { ...options, shouldValidate: true });
    form.setValue(`lineItems.${index}.description`, item.description || servicePackage.description || "", options);
    form.setValue(`lineItems.${index}.quantity`, item.quantity, options);
    form.setValue(`lineItems.${index}.unit`, item.unit, options);
    form.setValue(`lineItems.${index}.unitPrice`, unitPrice, options);
    form.setValue(`lineItems.${index}.taxRate`, currency === "USD" ? 0 : 18, options);
    form.setValue(`lineItems.${index}.sacCode`, item.sacCode || servicePackage.sacCode || "9983", options);
    form.setValue(`lineItems.${index}.billingCycle`, item.billingCycle, options);
    form.setFocus(`lineItems.${index}.quantity`);
  };

  const handleLineItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((field) => field.formId === active.id);
    const newIndex = fields.findIndex((field) => field.formId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    move(oldIndex, newIndex);
  };

  const subtotal = lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const tax = currency === "USD"
    ? 0
    : lineItems.reduce((total, item) => total + (item.quantity * item.unitPrice * (item.taxRate || 0)) / 100, 0);
  const taxBreakdown = currency === "USD"
    ? []
    : Array.from(
        lineItems.reduce((breakdown, item) => {
          const rate = item.taxRate || 0;
          breakdown.set(
            rate,
            (breakdown.get(rate) || 0) + (item.quantity * item.unitPrice * rate) / 100,
          );
          return breakdown;
        }, new Map<number, number>()),
      ).filter(([rate]) => rate > 0).sort(([firstRate], [secondRate]) => firstRate - secondRate);
  const grandTotal = Math.max(0, Math.round(subtotal + tax - discount));

  const handleSubmit = form.handleSubmit(async (data: InvoiceFormValues) => {
    const payload = {
      ...data,
      exchangeRate: data.currency === "USD" ? data.exchangeRate : null,
      placeOfSupply: data.currency === "USD" ? data.placeOfSupply : null,
      dueDate: data.dueDate || null,
      bankAccountId: data.bankAccountId || null,
      lineItems: data.lineItems.map((li) => ({
        ...li,
        taxRate: data.currency === "USD" ? 0 : (li.taxRate || 0),
        sacCode: li.sacCode || "9983",
      })),
    };

    setLoading(true);
    let res;
    if (initialData?.id) {
      res = await updateInvoice({ id: initialData.id, ...payload });
    } else {
      res = await createInvoice(payload);
    }
    setLoading(false);

    if (res.success && res.data) {
      toast.success(res.message || (initialData?.id ? "Invoice updated!" : "Invoice created!"));
      router.push(`/dashboard/invoices/${res.data.id}`);
    } else {
      toast.error(res.message || "Operation failed");
    }
  });

  const hasFormData = () => {
    const hasLineItemsData =
      lineItems.some(
        (item) => item.name.trim() !== "" || item.unitPrice > 0 || (item.description && item.description.trim() !== "")
      ) || lineItems.length > 1;

    const hasHeaderData = customerId !== "" || placeOfSupply.trim() !== "";

    return hasLineItemsData || hasHeaderData;
  };

  const applyCurrencyChange = (val: string) => {
    form.setValue("currency", val, { shouldDirty: true });
    form.setValue("discount", 0, { shouldDirty: true });
    replace([
      {
        name: "",
        description: "",
        quantity: 1,
        unit: "item",
        unitPrice: 0,
        taxRate: val === "USD" ? 0 : 18,
        sacCode: "9983",
        billingCycle: "ONE_TIME",
      },
    ]);

    if (val === "USD") {
      handleFetchRate();
    }
  };

  const handleCurrencyChange = (val: string) => {
    if (val === currency) return;

    if (hasFormData()) {
      setPendingCurrency(val);
      setCurrencyConfirmationOpen(true);
      return;
    }

    applyCurrencyChange(val);
  };

  const confirmCurrencyChange = () => {
    if (!pendingCurrency) return;
    applyCurrencyChange(pendingCurrency);
    setPendingCurrency(null);
  };

  const currencySymbol = currency === "USD" ? "$" : "₹";
  const formattedAmount = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const invoiceNumberLabel = initialData?.invoiceNumber
    ? `INV-${String(initialData.invoiceNumber).padStart(4, "0")}`
    : "Assigned when saved";
  const dueDateValue = getDateInputValue(dueDate);
  const dueDateLabel = dueDateValue
    ? formatInIST(new Date(`${dueDateValue}T12:00:00+05:30`), "MMM d, yyyy")
    : null;
  const actionBarLeft = isMobile
    ? "0px"
    : isTablet
      ? sidebarState === "expanded"
        ? "var(--sidebar-width)"
        : "calc(var(--sidebar-width-icon) + 1rem)"
      : sidebarState === "expanded"
        ? "var(--sidebar-width)"
        : "0px";

  return (
    <>
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto w-full min-w-0 max-w-[1280px] space-y-5 pb-36 sm:space-y-6 sm:px-2"
    >
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" asChild>
            <Link href="/dashboard/invoices" aria-label="Back to invoices">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {currency === "USD" ? "New export invoice" : initialData ? "Edit invoice" : "New invoice"}
              </h1>
              <Badge variant="secondary" className="hidden rounded-full sm:inline-flex">
                {initialData?.status.replaceAll("_", " ") ?? "Draft"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {currency === "USD" ? "Zero-rated export invoice under Indian GST LUT route" : invoiceNumberLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Controller
            name="currency"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="h-10 w-[112px]" aria-label="Invoice currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-12">
      <section className="min-w-0 space-y-5 xl:col-span-8">
        <section className="relative z-20 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-base font-semibold">Invoice details</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a customer and confirm the billing dates.</p>
            </div>
            {initialData?.invoiceNumber && (
              <Badge variant="outline" className="shrink-0">{invoiceNumberLabel}</Badge>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-5">
            <Field className="order-3 sm:col-span-1 lg:col-span-3 lg:row-start-2">
              <FieldLabel htmlFor="invoice-number">Invoice number</FieldLabel>
              <Input id="invoice-number" value={invoiceNumberLabel} readOnly aria-readonly="true" className="h-11 bg-muted/40" />
            </Field>
            <Controller
              name="issueDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="order-2 sm:col-span-1 lg:col-span-3 lg:row-start-2">
                  <FieldLabel htmlFor="invoice-issue-date">Invoice date</FieldLabel>
                  <Input
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    id="invoice-issue-date"
                    type="date"
                    value={getDateInputValue(field.value)}
                    onChange={(event) => {
                      const value = event.target.value;
                      field.onChange(value);
                      const selectedTerm = getPaymentTerm(form.getValues("terms"));
                      if (value && selectedTerm) {
                        form.setValue("dueDate", shiftDateOnly(value, selectedTerm.days), {
                          shouldDirty: true,
                        });
                      }
                    }}
                    aria-invalid={fieldState.invalid}
                    className="h-11"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="customerId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="order-1 sm:col-span-2 lg:col-span-6 lg:row-start-1">
                  <FieldLabel htmlFor="invoice-customer">Customer <span className="text-destructive">*</span></FieldLabel>
                  <div className="flex min-w-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <CustomerCombobox
                        value={field.value}
                        selectedCustomer={selectedCustomer}
                        onCreateCustomer={() => setCreateCustomerOpen(true)}
                        onValueChange={(customer) => {
                          setSelectedCustomer(customer);
                          field.onChange(customer.id);
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
                        }}
                      >
                        <XIcon />
                      </Button>
                    )}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="terms"
              control={form.control}
              render={({ field, fieldState }) => {
                const selectedPaymentTerm = getPaymentTerm(field.value);
                const isCustomTerms = !selectedPaymentTerm;
                return (
                  <Field data-invalid={fieldState.invalid} className="order-4 sm:col-span-1 lg:col-span-3 lg:row-start-2">
                    <FieldLabel htmlFor="invoice-payment-terms">Payment terms</FieldLabel>
                    <Select
                      value={selectedPaymentTerm?.label ?? "CUSTOM"}
                      onValueChange={(value) => {
                        if (value === "CUSTOM") {
                          if (!isCustomTerms) field.onChange("");
                          return;
                        }
                        const selectedTerm = getPaymentTerm(value);
                        if (!selectedTerm) return;
                        field.onChange(selectedTerm.label);
                        const issueDate = getDateInputValue(form.getValues("issueDate"));
                        if (issueDate) {
                          form.setValue("dueDate", shiftDateOnly(issueDate, selectedTerm.days), {
                            shouldDirty: true,
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="invoice-payment-terms" aria-invalid={fieldState.invalid} className="h-11">
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map((term) => (
                          <SelectItem key={term.label} value={term.label}>{term.label}</SelectItem>
                        ))}
                        <SelectItem value="CUSTOM">Custom terms</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomTerms && (
                      <Input
                        aria-label="Custom payment terms"
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Enter payment terms…"
                        className="h-10"
                      />
                    )}
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                );
              }}
            />
            <Controller
              name="dueDate"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="order-5 sm:col-span-1 lg:col-span-3 lg:row-start-2">
                  <FieldLabel htmlFor="invoice-due-date">Due date</FieldLabel>
                  <Input
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    id="invoice-due-date"
                    type="date"
                    value={getDateInputValue(field.value)}
                    onChange={(event) => field.onChange(event.target.value || null)}
                    aria-invalid={fieldState.invalid}
                    className="h-11"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="bankAccountId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="order-6 sm:col-span-2 lg:col-span-6 lg:row-start-1">
                  <FieldLabel htmlFor="invoice-bank-account">Receiving bank account</FieldLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={(value) => {
                      if (value === "__create_bank_account__") {
                        setCreateBankAccountOpen(true);
                        return;
                      }
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger id="invoice-bank-account" aria-invalid={fieldState.invalid} className="h-11">
                      <SelectValue placeholder="Select company bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName} - {account.bankName}{account.isDefault ? " (Primary)" : ""}
                        </SelectItem>
                      ))}
                      {canCreateBankAccount && (
                        <SelectItem value="__create_bank_account__">
                          <span className="flex items-center gap-2">
                            <PlusIcon className="size-4" />
                            Create bank account
                          </span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {currency === "USD" && (
              <>
                <Controller
                  name="exchangeRate"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="sm:col-span-6 lg:col-span-6">
                      <div className="flex items-center justify-between gap-2">
                        <FieldLabel htmlFor="invoice-exchange-rate">RBI exchange rate (₹/USD) <span className="text-destructive">*</span></FieldLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleFetchRate}
                          disabled={fetchingRate}
                          className="h-7 shrink-0 gap-1 px-1.5 text-xs"
                        >
                          {fetchingRate ? <Loader2Icon className="size-3 animate-spin" /> : <RefreshCwIcon className="size-3" />}
                          Fetch rate
                        </Button>
                      </div>
                      <Input
                        {...field}
                        id="invoice-exchange-rate"
                        type="number"
                        step="any"
                        min="0.0001"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value === "" ? undefined : Number(event.target.value))}
                        aria-invalid={fieldState.invalid}
                        className="h-11"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="placeOfSupply"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="sm:col-span-6 lg:col-span-6">
                      <FieldLabel htmlFor="invoice-place-of-supply">Place of supply <span className="text-destructive">*</span></FieldLabel>
                      <LocationAutocomplete
                        type="country"
                        id="invoice-place-of-supply"
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Select destination country"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </>
            )}
          </div>
        </section>

          <section className="relative z-10 space-y-4 border-t pt-5">
            <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Line items <span className="font-normal text-muted-foreground">({lineItems.length})</span></h2>
                <p className="mt-1 text-sm text-muted-foreground">Add services and set quantities, rates, and tax.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ServicePackageSearch onSelectPackage={handleAddPackage} currency={currency} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="hidden grid-cols-[minmax(0,3fr)_minmax(3.75rem,.8fr)_minmax(4.5rem,1.2fr)_minmax(4.25rem,1.1fr)_minmax(4.5rem,1.2fr)_2rem] gap-3 border-b pb-2 text-xs font-medium text-muted-foreground lg:grid">
                <span>Item details</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>GST</span>
                <span className="text-right">Amount</span>
                <span aria-hidden="true" />
              </div>
              <DndContext
                id="invoice-line-items"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleLineItemDragEnd}
              >
                <SortableContext
                  items={fields.map((field) => field.formId)}
                  strategy={verticalListSortingStrategy}
                >
                  {fields.map((row, index) => {
                    const item = lineItems[index];
                    if (!item) return null;
                    const lineTotal = item.quantity * item.unitPrice;

                    return (
                      <SortableInvoiceLineItem key={row.formId} id={row.formId} index={index}>
                        <div className="relative space-y-4 border-b border-border/70 py-4 last:border-b-0 sm:space-y-3">
                      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,3fr)_minmax(3.75rem,.8fr)_minmax(4.5rem,1.2fr)_minmax(4.25rem,1.1fr)_minmax(4.5rem,1.2fr)_2rem]">
                        <Controller
                          name={`lineItems.${index}.name`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="lg:col-start-1 lg:row-start-1">
                              <FieldLabel className="lg:sr-only" htmlFor={`line-item-${index}-name`}>Item or service name <span className="text-destructive">*</span></FieldLabel>
                              <InvoiceServiceAutocomplete
                                inputRef={field.ref}
                                inputId={`line-item-${index}-name`}
                                value={field.value}
                                currency={currency}
                                exchangeRate={exchangeRate}
                                invalid={fieldState.invalid}
                                onBlur={field.onBlur}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  form.setValue(`lineItems.${index}.servicePackageId`, null, { shouldDirty: true });
                                  form.setValue(`lineItems.${index}.serviceName`, null, { shouldDirty: true });
                                }}
                                onSelect={(servicePackage, serviceItem) => {
                                  handleSelectService(index, servicePackage, serviceItem);
                                }}
                              />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`lineItems.${index}.billingCycle`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="lg:col-start-1 lg:row-start-2">
                              <FieldLabel htmlFor={`line-item-${index}-cycle`}>Billing cycle</FieldLabel>
                              <Select
                                value={field.value || "ONE_TIME"}
                                onValueChange={(value) => field.onChange(BillingCycleEnum.parse(value))}
                              >
                                <SelectTrigger id={`line-item-${index}-cycle`} aria-invalid={fieldState.invalid} className="h-10 bg-background">
                                  <SelectValue placeholder="Select cycle" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ONE_TIME">One Time</SelectItem>
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                  <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                                  <SelectItem value="YEARLY">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`lineItems.${index}.quantity`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="sm:col-span-1 lg:col-start-2 lg:row-start-1">
                              <FieldLabel className="lg:sr-only" htmlFor={`line-item-${index}-quantity`}>Quantity</FieldLabel>
                              <Input
                                {...field}
                                id={`line-item-${index}-quantity`}
                                type="number"
                                min="1"
                                step="1"
                                value={field.value ?? ""}
                                onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
                                aria-invalid={fieldState.invalid}
                                className="h-10 bg-background"
                              />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`lineItems.${index}.unitPrice`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="lg:col-start-3 lg:row-start-1">
                              <FieldLabel className="lg:sr-only" htmlFor={`line-item-${index}-price`}>Rate ({currencySymbol})</FieldLabel>
                              <Input
                                {...field}
                                id={`line-item-${index}-price`}
                                type="number"
                                min="0"
                                step="any"
                                value={field.value ?? ""}
                                onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
                                aria-invalid={fieldState.invalid}
                                className="h-10 bg-background"
                              />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`lineItems.${index}.taxRate`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="lg:col-start-4 lg:row-start-1">
                              <FieldLabel className="lg:sr-only" htmlFor={`line-item-${index}-tax`}>Tax Rate</FieldLabel>
                              {currency === "USD" ? (
                                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">0% (Nil)</div>
                              ) : (
                                <Select value={String(field.value ?? 0)} onValueChange={(value) => field.onChange(Number(value))}>
                                  <SelectTrigger id={`line-item-${index}-tax`} aria-invalid={fieldState.invalid} className="h-10 bg-background">
                                    <SelectValue placeholder="Select tax rate" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0% Tax</SelectItem>
                                    <SelectItem value="5">5% GST</SelectItem>
                                    <SelectItem value="12">12% GST</SelectItem>
                                    <SelectItem value="18">18% GST</SelectItem>
                                    <SelectItem value="28">28% GST</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`lineItems.${index}.sacCode`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="lg:col-start-2 lg:row-start-2">
                              <FieldLabel htmlFor={`line-item-${index}-sac`}>SAC / HSN</FieldLabel>
                              <Input
                                {...field}
                                id={`line-item-${index}-sac`}
                                value={field.value || ""}
                                aria-invalid={fieldState.invalid}
                                placeholder="9983"
                                className="h-10 bg-background"
                              />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`lineItems.${index}.description`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="sm:col-span-2 lg:col-start-3 lg:col-span-3 lg:row-start-2">
                              <FieldLabel className="lg:sr-only" htmlFor={`line-item-${index}-description`}>Scope Notes <span className="font-normal text-muted-foreground">(Optional)</span></FieldLabel>
                              <Input
                                {...field}
                                value={field.value || ""}
                                id={`line-item-${index}-description`}
                                aria-invalid={fieldState.invalid}
                                placeholder="Add a short description…"
                                className="h-10 bg-background"
                              />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <div className="hidden text-right text-sm font-medium tabular-nums lg:col-start-5 lg:row-start-1 lg:block">
                          {formattedAmount(lineTotal)}
                        </div>
                      </div>
                    <div className="flex items-center justify-between gap-3 border-t pt-3 lg:justify-end lg:border-0 lg:pt-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={lineItems.length === 1}
                        aria-label={`Remove line item ${index + 1}`}
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive lg:absolute lg:right-0 lg:top-0"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                      <p className="text-right text-xs text-muted-foreground lg:hidden">
                        Line total: <span className="font-semibold tabular-nums text-foreground">{formattedAmount(lineTotal)}</span>
                      </p>
                    </div>
                        </div>
                      </SortableInvoiceLineItem>
                    );
                  })}
                </SortableContext>
              </DndContext>

              <Button
                type="button"
                variant="outline"
                onClick={handleAddLineItem}
                className="h-10 w-fit border-dashed"
              >
                <PlusIcon className="size-4" />
                Add line item
              </Button>
            </div>
          </section>
          <section className="space-y-4 border-t pt-5">
            <div>
              <h2 className="text-base font-semibold">Notes &amp; terms</h2>
              <p className="mt-1 text-sm text-muted-foreground">Printed on the invoice sent to your customer.</p>
            </div>
            <div>
              <Controller
                name="notes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invoice-notes">Message to your customer</FieldLabel>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      id="invoice-notes"
                      aria-invalid={fieldState.invalid}
                      placeholder="Add a note for your customer…"
                      rows={4}
                      className="resize-y"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Standard invoice terms and conditions are included automatically.
              </p>
            </div>
          </section>
      </section>

        <aside className="min-w-0 xl:col-span-4">
          <section className="space-y-5 rounded-xl bg-muted/30 p-5 xl:sticky xl:top-4">
            <div className="border-b border-border/70 pb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Summary &amp; taxes</h2>
                <span className="text-xs text-muted-foreground">Amounts in {currency} ({currencySymbol})</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formattedAmount(subtotal)}</span>
              </div>
              <Controller
                name="discount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="flex-row items-center justify-between gap-3">
                    <FieldLabel htmlFor="invoice-discount">Discount ({currencySymbol})</FieldLabel>
                    <div className="w-32">
                      <Input
                        {...field}
                        id="invoice-discount"
                        type="number"
                        min="0"
                        step="any"
                        value={field.value ?? 0}
                        onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
                        aria-invalid={fieldState.invalid}
                        className="h-10 text-right tabular-nums"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </div>
                  </Field>
                )}
              />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{currency === "USD" ? "Tax" : "GST"}</span>
                <span className="font-medium tabular-nums">{formattedAmount(tax)}</span>
              </div>
              {taxBreakdown.map(([rate, amount]) => (
                <div key={rate} className="flex items-center justify-between gap-3 pl-3 text-xs text-muted-foreground">
                  <span>GST ({rate}%)</span>
                  <span className="tabular-nums text-foreground">{formattedAmount(amount)}</span>
                </div>
              ))}
              <div className="border-t border-border/70 pt-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold">Total due</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dueDateLabel ? `Payment due ${dueDateLabel}` : "Includes applicable taxes"}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums text-primary">{formattedAmount(grandTotal)}</p>
                </div>
              </div>
              {form.formState.errors.lineItems?.root?.message && (
                <p role="alert" className="text-sm text-destructive">{form.formState.errors.lineItems.root.message}</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div
        className="fixed right-0 bottom-14 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur sm:bottom-0"
        style={{ left: actionBarLeft }}
      >
        {summaryExpanded && (
          <div className="absolute inset-x-0 bottom-full border-t bg-background px-4 py-4 shadow-lg sm:hidden">
            <div className="mx-auto max-w-[1280px] space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formattedAmount(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums">−{formattedAmount(discount)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">{currency === "USD" ? "Tax" : "GST"}</span>
                <span className="tabular-nums">{formattedAmount(tax)}</span>
              </div>
              {taxBreakdown.map(([rate, amount]) => (
                <div key={rate} className="flex justify-between gap-4 pl-3 text-xs text-muted-foreground">
                  <span>GST ({rate}%)</span>
                  <span className="tabular-nums">{formattedAmount(amount)}</span>
                </div>
              ))}
              {dueDateLabel && (
                <p className="border-t pt-2 text-xs text-muted-foreground">Payment due {dueDateLabel}</p>
              )}
            </div>
          </div>
        )}
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden min-w-0 sm:block">
            <p className="text-xs text-muted-foreground">Total due</p>
            <p className="font-semibold tabular-nums">{formattedAmount(grandTotal)}</p>
          </div>
          <button
            type="button"
            aria-expanded={summaryExpanded}
            aria-label={`${summaryExpanded ? "Hide" : "Show"} invoice total breakdown`}
            onClick={() => setSummaryExpanded((expanded) => !expanded)}
            className="flex min-w-0 items-center justify-between gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
          >
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">Total due</span>
              <span className="block truncate font-semibold tabular-nums">{formattedAmount(grandTotal)}</span>
            </span>
            {summaryExpanded ? <ChevronDownIcon className="size-4 shrink-0" /> : <ChevronUpIcon className="size-4 shrink-0" />}
          </button>
          <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/invoices">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="h-11 flex-1 gap-2 sm:flex-none">
              {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              {loading ? "Saving…" : "Save Draft Invoice"}
            </Button>
          </div>
        </div>
      </div>
    </form>
    <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[900px] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-h-[94dvh] sm:max-w-[900px]">
        <DialogHeader className="shrink-0 border-b bg-background px-4 py-3 sm:px-5 sm:py-4">
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <CustomerForm
          presentation="dialog"
          onCreated={(customer) => {
            setSelectedCustomer(customer);
            form.setValue("customerId", customer.id, { shouldValidate: true, shouldDirty: true });
            setCreateCustomerOpen(false);
          }}
          onCancel={() => setCreateCustomerOpen(false)}
        />
      </DialogContent>
    </Dialog>
    <Dialog open={createBankAccountOpen} onOpenChange={setCreateBankAccountOpen}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>Add bank account</DialogTitle>
        </DialogHeader>
        <BankAccountForm
          onSuccess={async (accountId) => {
            const accounts = await reloadBankAccounts();
            if (accountId && accounts?.some((account) => account.id === accountId)) {
              form.setValue("bankAccountId", accountId, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }
            setCreateBankAccountOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
    <AlertDialog
      open={currencyConfirmationOpen}
      onOpenChange={(open) => {
        setCurrencyConfirmationOpen(open);
        if (!open) setPendingCurrency(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change invoice currency?</AlertDialogTitle>
          <AlertDialogDescription>
            Changing currency resets invoice line items, pricing, and tax settings. Continue with the new currency?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline">Keep current currency</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" variant="destructive" onClick={confirmCurrencyChange}>
              Change currency
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
