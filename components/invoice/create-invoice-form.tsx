"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInvoice, updateInvoice, getCompanyBankAccounts, getInvoiceById } from "@/actions/invoice";
import { getLiveExchangeRate } from "@/actions/exchange-rate";
import { GetCustomers } from "@/actions/customer";
import { toast } from "sonner";
import { ServicePackageSearch, ServicePackageSearchResult } from "@/components/invoice/service-package-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, Trash2Icon, ArrowLeftIcon, SaveIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import {
  BillingCycleEnum,
  InvoiceFormInput,
  InvoiceFormValues,
  invoiceFormSchema,
} from "@/lib/schemas/invoice-schema";
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

type InvoiceInitialData = NonNullable<
  Extract<Awaited<ReturnType<typeof getInvoiceById>>, { success: true }>["data"]
>;

export function CreateInvoiceForm({ initialData }: { initialData?: InvoiceInitialData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [currencyConfirmationOpen, setCurrencyConfirmationOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Array<{ id: string; displayName: string; companyName: string | null }>>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; accountName: string; bankName: string; isDefault: boolean }>>([]);

  const form = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      customerId: initialData?.customerId || "",
      title: initialData?.title || "",
      currency: initialData?.currency || "INR",
      exchangeRate: initialData?.exchangeRate || 83.5,
      placeOfSupply: initialData?.placeOfSupply || "",
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 10) : null,
      notes: initialData?.notes ?? "Please reach out if you have any questions regarding this invoice.",
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
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lineItems",
    keyName: "formId",
  });
  const currency = useWatch({ control: form.control, name: "currency" }) || "INR";
  const exchangeRate = useWatch({ control: form.control, name: "exchangeRate" }) || 83.5;
  const placeOfSupply = useWatch({ control: form.control, name: "placeOfSupply" }) || "";
  const customerId = useWatch({ control: form.control, name: "customerId" }) || "";
  const title = useWatch({ control: form.control, name: "title" }) || "";
  const discount = useWatch({ control: form.control, name: "discount" }) || 0;
  const lineItems = useWatch({ control: form.control, name: "lineItems" }) || [];

  useEffect(() => {
    async function loadData() {
      const custRes = await GetCustomers({ page: 0, pageSize: 100, sortDirection: "desc" });
      if (custRes.success && custRes.data) {
        setCustomers(custRes.data);
      }
      const bankRes = await getCompanyBankAccounts();
      if (bankRes.success && bankRes.data && bankRes.data.length > 0) {
        setBankAccounts(bankRes.data);
        if (!initialData?.bankAccountId) {
          const defaultAccount = bankRes.data.find((b) => b.isDefault) || bankRes.data[0];
          if (defaultAccount) {
            form.setValue("bankAccountId", defaultAccount.id, { shouldDirty: true });
          }
        }
      }
    }
    loadData();
  }, [form, initialData?.bankAccountId]);

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

  const subtotal = lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const tax = currency === "USD"
    ? 0
    : lineItems.reduce((total, item) => total + (item.quantity * item.unitPrice * (item.taxRate || 0)) / 100, 0);
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

    const hasHeaderData = customerId !== "" || title.trim() !== "" || placeOfSupply.trim() !== "";

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

  return (
    <>
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto w-full min-w-0 max-w-[1440px] space-y-4 pb-32 sm:space-y-6 sm:pb-8"
    >
      <header className="-mx-3 sticky top-0 z-30 border-b bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" asChild>
              <Link href="/dashboard/invoices" aria-label="Back to invoices">
                <ArrowLeftIcon className="size-4" />
              </Link>
            </Button>
            <Badge variant="secondary" className="max-w-[150px] truncate rounded-full">
              <span className="mr-1.5 size-1.5 rounded-full bg-amber-500" />
              {initialData?.invoiceNumber ? `Draft #${initialData.invoiceNumber}` : "New invoice draft"}
            </Badge>
          </div>
          <Controller
            name="currency"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="h-9 w-[104px] shrink-0" aria-label="Invoice currency">
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
        <div className="mt-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {currency === "USD" ? "Create Export Invoice" : initialData ? "Update Invoice" : "Create Invoice"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {currency === "USD" ? "Zero-rated export invoice under Indian GST LUT route" : "New client billing and GST tax invoice"}
          </p>
        </div>
      </header>

      <Card className="hidden gap-0 overflow-visible sm:flex sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0" asChild>
            <Link href="/dashboard/invoices" aria-label="Back to invoices">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                <span className="mr-1.5 size-1.5 rounded-full bg-amber-500" />
                {initialData?.invoiceNumber ? `Draft #${initialData.invoiceNumber}` : "New invoice draft"}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold tracking-tight lg:text-2xl">
              {currency === "USD" ? "Create Export Invoice" : initialData ? "Update Invoice" : "Create Invoice"}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {currency === "USD" ? "Zero-rated export invoice under Indian GST LUT route" : "Generate a compliant invoice and billing breakdown"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Controller
            name="currency"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-[110px]" aria-label="Invoice currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <ServicePackageSearch onSelectPackage={handleAddPackage} currency={currency} />
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            Save Draft Invoice
          </Button>
        </div>
      </Card>

      <div className="sm:hidden">
        <ServicePackageSearch onSelectPackage={handleAddPackage} currency={currency} />
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
        <div className="min-w-0 space-y-4 md:col-span-8 md:space-y-6">
          <Card className="relative z-20 overflow-visible">
            <CardHeader className="border-b pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Invoice Details</CardTitle>
                  <CardDescription className="mt-1">Customer selection and invoice metadata</CardDescription>
                </div>
                {initialData?.invoiceNumber && (
                  <Badge variant="outline" className="shrink-0">{initialData.invoiceNumber}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 sm:gap-5">
              <Controller
                name="customerId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                    <FieldLabel htmlFor="invoice-customer">Customer <span className="text-destructive">*</span></FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="invoice-customer" aria-invalid={fieldState.invalid} className="h-11">
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.displayName}{customer.companyName ? ` (${customer.companyName})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                    <FieldLabel htmlFor="invoice-title">Invoice Title <span className="text-destructive">*</span></FieldLabel>
                    <Input
                      {...field}
                      id="invoice-title"
                      aria-invalid={fieldState.invalid}
                      placeholder="e.g. Custom Software Export Billing Phase 1"
                      className="h-11"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="dueDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invoice-due-date">Due Date</FieldLabel>
                    <Input
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      id="invoice-due-date"
                      type="date"
                      value={typeof field.value === "string" ? field.value : field.value?.toISOString().slice(0, 10) ?? ""}
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
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invoice-bank-account">Receiving Bank Account</FieldLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger id="invoice-bank-account" aria-invalid={fieldState.invalid} className="h-11">
                        <SelectValue placeholder="Select company bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountName} - {account.bankName}{account.isDefault ? " (Primary)" : ""}
                          </SelectItem>
                        ))}
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
                      <Field data-invalid={fieldState.invalid}>
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel htmlFor="invoice-exchange-rate">RBI Exchange Rate (₹/USD) <span className="text-destructive">*</span></FieldLabel>
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
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="invoice-place-of-supply">Place of Supply <span className="text-destructive">*</span></FieldLabel>
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
            </CardContent>
          </Card>

          <Card className="relative z-10">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b pb-4">
              <div>
                <CardTitle>Line Items <span className="font-normal text-muted-foreground">({lineItems.length})</span></CardTitle>
                <CardDescription className="mt-1">Add or customize services, rates, and taxes</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={handleAddLineItem} className="h-10 shrink-0 gap-2">
                <PlusIcon className="size-4" />
                <span className="hidden sm:inline">Add Item</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {fields.map((row, index) => {
                const item = lineItems[index];
                if (!item) return null;
                const lineTotal = item.quantity * item.unitPrice;

                return (
                  <div key={row.formId} className="space-y-4 rounded-xl border bg-muted/20 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-12">
                        <Controller
                          name={`lineItems.${index}.name`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="xl:col-span-7">
                              <FieldLabel htmlFor={`line-item-${index}-name`}>Item / Service Name <span className="text-destructive">*</span></FieldLabel>
                              <Input
                                {...field}
                                id={`line-item-${index}-name`}
                                aria-invalid={fieldState.invalid}
                                placeholder="e.g. Consulting, design, development"
                                className="h-10 bg-background"
                              />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                        <Controller
                          name={`lineItems.${index}.billingCycle`}
                          control={form.control}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="xl:col-span-5">
                              <FieldLabel htmlFor={`line-item-${index}-cycle`}>Billing Cycle</FieldLabel>
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
                            <Field data-invalid={fieldState.invalid} className="sm:col-span-1 xl:col-span-2">
                              <FieldLabel htmlFor={`line-item-${index}-quantity`}>Quantity</FieldLabel>
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
                            <Field data-invalid={fieldState.invalid} className="xl:col-span-3">
                              <FieldLabel htmlFor={`line-item-${index}-price`}>Rate ({currencySymbol})</FieldLabel>
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
                            <Field data-invalid={fieldState.invalid} className="xl:col-span-3">
                              <FieldLabel htmlFor={`line-item-${index}-tax`}>Tax Rate</FieldLabel>
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
                            <Field data-invalid={fieldState.invalid} className="xl:col-span-4">
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
                            <Field data-invalid={fieldState.invalid} className="sm:col-span-2 xl:col-span-8">
                              <FieldLabel htmlFor={`line-item-${index}-description`}>Scope Notes <span className="font-normal text-muted-foreground">(Optional)</span></FieldLabel>
                              <Input
                                {...field}
                                value={field.value || ""}
                                id={`line-item-${index}-description`}
                                aria-invalid={fieldState.invalid}
                                placeholder="Describe the work included in this item"
                                className="h-10 bg-background"
                              />
                              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                        Remove
                      </Button>
                      <p className="text-right text-xs text-muted-foreground">
                        Line total: <span className="font-semibold tabular-nums text-foreground">{formattedAmount(lineTotal)}</span>
                      </p>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddLineItem}
                className="h-11 w-full border-dashed"
              >
                <PlusIcon className="size-4" />
                Add Another Line Item
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 md:sticky md:top-20 md:col-span-4 md:space-y-6">
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Invoice Summary</CardTitle>
                <span className="text-xs text-muted-foreground">Amounts in {currency} ({currencySymbol})</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
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
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold">Grand Total</p>
                    <p className="mt-1 text-xs text-muted-foreground">Includes applicable taxes</p>
                  </div>
                  <p className="text-right text-xl font-bold tabular-nums text-primary sm:text-2xl">{formattedAmount(grandTotal)}</p>
                </div>
              </div>
              {form.formState.errors.lineItems?.root?.message && (
                <p role="alert" className="text-sm text-destructive">{form.formState.errors.lineItems.root.message}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle>Notes &amp; Terms</CardTitle>
              <CardDescription>Shown on the invoice sent to your customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Controller
                name="notes"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invoice-notes">Client Notes</FieldLabel>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      id="invoice-notes"
                      aria-invalid={fieldState.invalid}
                      placeholder="Notes visible to the client..."
                      rows={4}
                      className="resize-y"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="terms"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="invoice-terms">Terms &amp; Conditions</FieldLabel>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      id="invoice-terms"
                      aria-invalid={fieldState.invalid}
                      placeholder="Payment terms and policies..."
                      rows={4}
                      className="resize-y"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-14 z-40 border-t bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:hidden">
        <Button type="submit" disabled={loading} className="h-11 w-full gap-2">
          {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Save Draft Invoice
        </Button>
      </div>
    </form>
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
