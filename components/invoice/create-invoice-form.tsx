"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createInvoice, getCompanyBankAccounts } from "@/actions/invoice";
import { GetCustomers } from "@/actions/customer";
import { ServicePackageSearch, ServicePackageSearchResult } from "@/components/invoice/service-package-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, Trash2Icon, ArrowLeftIcon, SaveIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { InvoiceLineItemInput } from "@/lib/schemas/invoice-schema";

export function CreateInvoiceForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; displayName: string; companyName: string | null }>>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: string; accountName: string; bankName: string; isDefault: boolean }>>([]);

  const [currency, setCurrency] = useState("INR");
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [discount, setDiscount] = useState(0);

  const [lineItems, setLineItems] = useState<InvoiceLineItemInput[]>([
    {
      name: "",
      description: "",
      quantity: 1,
      unit: "item",
      unitPrice: 0,
      taxRate: 18,
      billingCycle: "ONE_TIME",
    },
  ]);

  useEffect(() => {
    async function loadData() {
      const custRes = await GetCustomers({ page: 0, pageSize: 100, sortDirection: "desc" });
      if (custRes.success && custRes.data) {
        setCustomers(custRes.data);
      }
      const bankRes = await getCompanyBankAccounts();
      if (bankRes.success && bankRes.data && bankRes.data.length > 0) {
        setBankAccounts(bankRes.data);
        const defaultAccount = bankRes.data.find((b) => b.isDefault) || bankRes.data[0];
        if (defaultAccount) {
          setBankAccountId(defaultAccount.id);
        }
      }
    }
    loadData();
  }, []);

  const handleAddPackage = (pkg: ServicePackageSearchResult) => {
    const newItems: InvoiceLineItemInput[] = pkg.items.map((item) => ({
      servicePackageId: pkg.id,
      name: `${pkg.serviceName} - ${item.name}`,
      description: item.description || pkg.description || "",
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: currency === "USD" && item.unitPriceUSD > 0 ? item.unitPriceUSD : item.unitPrice,
      taxRate: currency === "USD" ? 0 : 18,
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
        billingCycle: "ONE_TIME",
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceLineItemInput, value: any) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const calculateSubtotal = () =>
    lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  const calculateTax = () =>
    lineItems.reduce(
      (acc, item) => acc + (item.quantity * item.unitPrice * (item.taxRate || 0)) / 100,
      0
    );

  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const grandTotal = Math.max(0, Math.round(subtotal + tax - discount));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !title.trim()) return;

    setLoading(true);
    const res = await createInvoice({
      customerId,
      title,
      currency,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      terms,
      bankAccountId: bankAccountId || null,
      discount,
      lineItems,
    });
    setLoading(false);

    if (res.success && res.data) {
      router.push(`/dashboard/invoices/${res.data.id}`);
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
            <h1 className="text-2xl font-bold tracking-tight">Create Invoice</h1>
            <p className="text-sm text-muted-foreground">
              Generate a new client billing invoice
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={currency} onValueChange={setCurrency}>
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
              placeholder="e.g. Web Development Phase 1 Billing"
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
          {lineItems.map((item, index) => (
            <div key={index} className="flex flex-col gap-3 p-3 rounded-lg border bg-card">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4">
                  <Input
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, "name", e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                    required
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit Price (₹)"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Select
                    value={String(item.taxRate)}
                    onValueChange={(val) => handleItemChange(index, "taxRate", Number(val))}
                  >
                    <SelectTrigger>
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
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="text-destructive"
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
