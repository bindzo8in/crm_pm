"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, updateInvoice, getCompanyBankAccounts } from "@/actions/invoice";
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
import { InvoiceLineItemInput } from "@/lib/schemas/invoice-schema";

export function CreateInvoiceForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; displayName: string; companyName: string | null }>>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; accountName: string; bankName: string; isDefault: boolean }>>([]);

  const [currency, setCurrency] = useState(initialData?.currency || "INR");
  const [exchangeRate, setExchangeRate] = useState<number>(initialData?.exchangeRate || 83.50);
  const [placeOfSupply, setPlaceOfSupply] = useState(initialData?.placeOfSupply || "");
  const [customerId, setCustomerId] = useState(initialData?.customerId || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate ? new Date(initialData.dueDate).toISOString().slice(0, 10) : ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [terms, setTerms] = useState(initialData?.terms || "");
  const [bankAccountId, setBankAccountId] = useState(initialData?.bankAccountId || "");
  const [discount, setDiscount] = useState(initialData?.discount || 0);

  const [lineItems, setLineItems] = useState<any[]>(
    initialData?.lineItems && initialData.lineItems.length > 0
      ? initialData.lineItems.map((li: any) => ({
          id: li.id,
          servicePackageId: li.servicePackageId || null,
          serviceName: li.servicePackage?.service?.name || li.servicePackage?.name || null,
          name: li.name,
          description: li.description || "",
          quantity: li.quantity,
          unit: li.unit || "item",
          unitPrice: li.unitPrice,
          taxRate: initialData?.currency === "USD" ? 0 : (li.taxRate || 18),
          sacCode: li.sacCode || "9983",
          billingCycle: li.billingCycle || "ONE_TIME",
        }))
      : [
          {
            name: "",
            description: "",
            quantity: 1,
            unit: "item",
            unitPrice: 0,
            taxRate: 18,
            sacCode: "9983",
            billingCycle: "ONE_TIME",
          },
        ]
  );

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
            setBankAccountId(defaultAccount.id);
          }
        }
      }
    }
    loadData();
  }, []);

  const handleFetchRate = async () => {
    setFetchingRate(true);
    const res = await getLiveExchangeRate("USD", "INR");
    setFetchingRate(false);
    if (res.success && res.data) {
      setExchangeRate(res.data.rate);
      toast.success(`Rate updated: ₹${res.data.rate} / USD (${res.data.source})`);
    } else {
      toast.error("Failed to fetch live exchange rate");
    }
  };

  const handleAddPackage = (pkg: ServicePackageSearchResult) => {
    const newItems = pkg.items.map((item) => ({
      servicePackageId: pkg.id,
      serviceName: pkg.serviceName ? `${pkg.serviceName} • ${pkg.name}` : pkg.name,
      name: item.name,
      description: item.description || pkg.description || "",
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: currency === "USD" && item.unitPriceUSD > 0 ? item.unitPriceUSD : item.unitPrice,
      taxRate: currency === "USD" ? 0 : 18,
      sacCode: item.sacCode || pkg.sacCode || "9983",
      billingCycle: item.billingCycle,
    }));

    if (lineItems.length === 1 && !lineItems[0].name.trim()) {
      setLineItems(newItems);
    } else {
      setLineItems((prev) => [...prev, ...newItems]);
    }
  };

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        quantity: 1,
        unit: "item",
        unitPrice: 0,
        taxRate: currency === "USD" ? 0 : 18,
        sacCode: "9983",
        billingCycle: "ONE_TIME",
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceLineItemInput | "sacCode", value: any) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const calculateSubtotal = () =>
    lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  const calculateTax = () => {
    if (currency === "USD") return 0;
    return lineItems.reduce(
      (acc, item) => acc + (item.quantity * item.unitPrice * (item.taxRate || 0)) / 100,
      0
    );
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const grandTotal = Math.max(0, Math.round(subtotal + tax - discount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !title.trim()) return;

    const payload = {
      customerId,
      title,
      currency,
      exchangeRate: currency === "USD" ? exchangeRate : null,
      placeOfSupply: currency === "USD" ? placeOfSupply : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      terms,
      bankAccountId: bankAccountId || null,
      discount,
      lineItems: lineItems.map((li) => ({
        ...li,
        taxRate: currency === "USD" ? 0 : (li.taxRate || 0),
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
  };

  const handleCurrencyChange = (val: string) => {
    setCurrency(val);
    if (val === "USD") {
      setLineItems((prev) => prev.map((item) => ({ ...item, taxRate: 0 })));
      handleFetchRate();
    } else {
      setLineItems((prev) => prev.map((item) => ({ ...item, taxRate: item.taxRate === 0 ? 18 : item.taxRate })));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {currency === "USD" ? "Create Export Invoice (LUT 0% Tax)" : "Create Invoice"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {currency === "USD"
                ? "Zero-rated export invoice under Indian GST LUT route"
                : "Generate a new client billing invoice"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR (₹)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
            </SelectContent>
          </Select>
          <ServicePackageSearch onSelectPackage={handleAddPackage} currency={currency} />
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
            Save Draft Invoice
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
          <CardDescription>Select customer and basic invoice parameters</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer *</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.displayName} {c.companyName ? `(${c.companyName})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Title *</label>
            <Input
              placeholder="e.g. Custom Software Export Billing Phase 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bank Account</label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company bank account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.accountName} - {b.bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currency === "USD" && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">RBI Exchange Rate (₹/USD) *</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleFetchRate}
                    disabled={fetchingRate}
                    className="h-6 text-xs text-blue-600 gap-1 px-1.5"
                  >
                    {fetchingRate ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <RefreshCwIcon className="h-3 w-3" />}
                    Fetch Today&apos;s Rate
                  </Button>
                </div>
                <Input
                  type="number"
                  step="any"
                  min="0.0001"
                  placeholder="e.g. 83.50"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Place of Supply (Destination Country) *</label>
                <Input
                  placeholder="e.g. United States or State Code 96"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Line Items</CardTitle>
            <CardDescription>Add or customize services and items</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={handleAddLineItem} className="gap-2">
            <PlusIcon className="h-4 w-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden md:grid grid-cols-12 gap-2.5 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 rounded-md border">
            <div className="col-span-3">Item & Description</div>
            <div className="col-span-2">Billing Cycle</div>
            <div className="col-span-1 text-center">Qty</div>
            <div className="col-span-2 text-right">Unit Price ({currency === "USD" ? "$" : "₹"})</div>
            <div className="col-span-2 text-center">SAC Code</div>
            <div className="col-span-2 text-right">Tax Rate</div>
          </div>

          {lineItems.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 p-3 rounded-lg border bg-card">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                <div className="md:col-span-3 space-y-1">
                  {item.serviceName && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {item.serviceName}
                      </span>
                    </div>
                  )}
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    value={item.billingCycle || "ONE_TIME"}
                    onValueChange={(val) => handleItemChange(index, "billingCycle", val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONE_TIME">One Time</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={`Unit Price (${currency === "USD" ? "$" : "₹"})`}
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    placeholder="SAC Code (e.g. 9983)"
                    value={item.sacCode || "9983"}
                    onChange={(e) => handleItemChange(index, "sacCode", e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-1">
                  <div className="flex-1">
                    {currency === "USD" ? (
                      <div className="h-9 px-2.5 py-1.5 rounded-md border bg-muted text-xs flex items-center justify-center text-muted-foreground font-medium">
                        0% (Nil)
                      </div>
                    ) : (
                      <Select
                        value={String(item.taxRate)}
                        onValueChange={(val) => handleItemChange(index, "taxRate", Number(val))}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Tax %" />
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
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="text-destructive h-9 w-9 shrink-0"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Input
                placeholder="Description (optional)"
                value={item.description || ""}
                onChange={(e) => handleItemChange(index, "description", e.target.value)}
                className="text-xs"
              />
            </div>
          ))}

          <div className="flex flex-col items-end pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between w-64 text-muted-foreground">
              <span>Subtotal:</span>
              <span>{currency === "USD" ? "$" : "₹"}{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-64 text-muted-foreground">
              <span>Tax Total:</span>
              <span>{currency === "USD" ? "$" : "₹"}{tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between w-64 items-center">
              <span>Discount ({currency === "USD" ? "$" : "₹"}):</span>
              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-28 text-right h-8"
              />
            </div>
            <div className="flex justify-between w-64 font-bold text-lg pt-2 border-t text-primary">
              <span>Grand Total:</span>
              <span>{currency === "USD" ? "$" : "₹"}{grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes & Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Notes</label>
            <Textarea
              placeholder="Notes visible to the client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Terms & Conditions</label>
            <Textarea
              placeholder="Payment terms and policies..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
