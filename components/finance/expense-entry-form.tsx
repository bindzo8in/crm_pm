"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { createExpense, createExpenseCategory } from "@/actions/finance";
import { CustomerForm } from "@/components/customers/create-edit";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { ExpenseCategoryCombobox, type ExpenseCategoryOption } from "@/components/finance/expense-category-combobox";
import { ExpenseAttachmentUpload } from "@/components/finance/expense-attachment-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Account = {
  id: string;
  name: string;
  isActive: boolean;
};

type Props = {
  accounts: Account[];
};

const paymentMethods = [
  ["BANK_TRANSFER", "Bank transfer"],
  ["UPI", "UPI"],
  ["CREDIT_CARD", "Credit card"],
  ["DEBIT_CARD", "Debit card"],
  ["CHEQUE", "Cheque"],
  ["CASH", "Cash"],
  ["OTHER", "Other"],
] as const;

function CreateExpenseCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: ExpenseCategoryOption) => void;
}) {
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSaving(true);

    try {
      const response = await createExpenseCategory({
        name: String(formData.get("name") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim() || null,
        isActive: true,
      });

      if (!response.success || !response.data) {
        toast.error(response.message);
        return;
      }

      onCreated({
        id: response.data.id,
        name: response.data.name,
        isActive: response.data.isActive,
      });
      toast.success("Expense category created");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to create expense category:", error);
      toast.error("Could not create this category. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create expense category</DialogTitle>
          <DialogDescription>
            Add a category and select it for this expense.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-category-name">Category name *</Label>
            <Input id="expense-category-name" name="name" required maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-category-description">Description</Label>
            <Textarea
              id="expense-category-description"
              name="description"
              maxLength={200}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating…" : "Create and select"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseEntryForm({ accounts }: Props) {
  const router = useRouter();
  const [createCustomerOpen, setCreateCustomerOpen] = React.useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerOption | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<ExpenseCategoryOption | null>(null);
  const [attachment, setAttachment] = React.useState<{
    url: string;
    publicId: string;
    resourceType: "image" | "raw";
  } | null>(null);
  const [expenseType, setExpenseType] = React.useState<"GOODS" | "SERVICES">("SERVICES");
  const [taxRate, setTaxRate] = React.useState("");
  const [taxInclusive, setTaxInclusive] = React.useState("false");
  const [gstTreatment, setGstTreatment] = React.useState("");
  const [gstTreatmentOpen, setGstTreatmentOpen] = React.useState(false);
  const [gstTreatmentSearch, setGstTreatmentSearch] = React.useState("");
  const activeAccounts = accounts.filter((account) => account.isActive);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCategory) {
      toast.error("Select an expense category");
      return;
    }
    if (!gstTreatment) {
      toast.error("Select a GST treatment");
      setGstTreatmentOpen(true);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const saveMode =
      event.nativeEvent instanceof SubmitEvent
      && event.nativeEvent.submitter instanceof HTMLButtonElement
        ? event.nativeEvent.submitter.value
        : "save";
    const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
    const taxRateValue = String(formData.get("taxRate") ?? "");
    setIsSaving(true);

    try {
      const response = await createExpense({
        description: selectedCategory.name,
        amount: formData.get("amount"),
        expenseDate: formData.get("expenseDate"),
        categoryId: selectedCategory.id,
        financialAccountId: formData.get("financialAccountId"),
        paymentMethod: formData.get("paymentMethod"),
        vendorName: formData.get("vendorName"),
        referenceNumber: invoiceNumber,
        notes: formData.get("notes"),
        status: formData.get("status"),
        customerId: selectedCustomer?.id ?? null,
        receiptUrl: attachment?.url ?? null,
        expenseType,
        sacCode: formData.get("sacCode"),
        gstTreatment: formData.get("gstTreatment"),
        sourceOfSupply: formData.get("sourceOfSupply"),
        destinationOfSupply: formData.get("destinationOfSupply"),
        reverseCharge: formData.get("reverseCharge") === "on",
        taxRate: taxRateValue ? Number(taxRateValue) : null,
        taxInclusive: taxInclusive === "true",
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success("Expense recorded");
      if (saveMode === "new") {
        form.reset();
        setSelectedCategory(null);
        setSelectedCustomer(null);
        setAttachment(null);
        setExpenseType("SERVICES");
        setTaxRate("");
        setTaxInclusive("false");
        setGstTreatment("");
        setGstTreatmentSearch("");
      } else {
        router.push("/dashboard/finance");
      }
      router.refresh();
    } catch (error) {
      console.error("Could not save this expense:", error);
      toast.error("Could not save this expense. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCategoryCreated(category: ExpenseCategoryOption) {
    setSelectedCategory(category);
  }

  const fieldClassName = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const rowClassName = "grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[8rem_minmax(0,18.5rem)]";

  const supplyStates = [
    ["AN", "Andaman and Nicobar Islands"], ["AP", "Andhra Pradesh"], ["AR", "Arunachal Pradesh"],
    ["AS", "Assam"], ["BR", "Bihar"], ["CH", "Chandigarh"], ["CG", "Chhattisgarh"],
    ["DN", "Dadra and Nagar Haveli and Daman and Diu"], ["DL", "Delhi"], ["GA", "Goa"],
    ["GJ", "Gujarat"], ["HR", "Haryana"], ["HP", "Himachal Pradesh"], ["JK", "Jammu and Kashmir"],
    ["JH", "Jharkhand"], ["KA", "Karnataka"], ["KL", "Kerala"], ["LA", "Ladakh"],
    ["LD", "Lakshadweep"], ["MP", "Madhya Pradesh"], ["MH", "Maharashtra"], ["MN", "Manipur"],
    ["ML", "Meghalaya"], ["MZ", "Mizoram"], ["NL", "Nagaland"], ["OD", "Odisha"],
    ["PY", "Puducherry"], ["PB", "Punjab"], ["RJ", "Rajasthan"], ["SK", "Sikkim"],
    ["TN", "Tamil Nadu"], ["TS", "Telangana"], ["TR", "Tripura"], ["UP", "Uttar Pradesh"],
    ["UK", "Uttarakhand"], ["WB", "West Bengal"],
  ] as const;

  const gstTreatments = [
    ["REGISTERED_REGULAR", "Registered Business - Regular", "Business that is registered under GST"],
    ["REGISTERED_COMPOSITION", "Registered Business - Composition", "Business that is registered under the Composition Scheme in GST"],
    ["UNREGISTERED", "Unregistered Business", "Business that has not been registered under GST"],
    ["CONSUMER", "Consumer", "A customer who is a regular consumer"],
    ["OVERSEAS", "Overseas", "Persons with whom you do import or export of supplies outside India"],
    ["SEZ", "Special Economic Zone", "Business (Unit) that is located in a Special Economic Zone (SEZ) of India or a SEZ Developer"],
    ["DEEMED_EXPORT", "Deemed Export", "Supply of goods to an Export Oriented Unit or against Advanced Authorization/Export Promotion Capital Goods."],
    ["NON_GST_SUPPLY", "Non-GST Supply", "Transactions with supplies that do not attract GST"],
    ["OUT_OF_SCOPE", "Out Of Scope", "Transactions that do not come under the ambit of GST"],
    ["TAX_DEDUCTOR", "Tax Deductor", "Departments of the State/Central government, governmental agencies or local authorities"],
    ["SEZ_DEVELOPER", "SEZ Developer", "A person/organisation who owns at least 26% of the equity in creating business units in a Special Economic Zone (SEZ)"],
    ["INPUT_SERVICE_DISTRIBUTOR", "Input Service Distributor", "An office that receives tax invoices for services used by the company in different states under the same PAN."],
  ] as const;
  const filteredGstTreatments = gstTreatments.filter(([value, label, description]) =>
    `${value} ${label} ${description}`.toLowerCase().includes(gstTreatmentSearch.trim().toLowerCase())
  );
  const selectedGstTreatment = gstTreatments.find(([value]) => value === gstTreatment);

  return (
    <main className="-mx-3 -mt-4 -mb-[calc(5rem_+_env(safe-area-inset-bottom))] flex min-h-[calc(100dvh_-_var(--header-height))] flex-col bg-background text-foreground sm:-mx-5 sm:-mt-6 md:-mb-6 lg:-mx-6">
      {/* <div className="flex h-11 shrink-0 items-stretch border-b bg-background px-4 sm:px-5">
        <div className="flex items-center border-t-2 border-primary px-3 text-sm font-medium text-foreground">
          Record Expense
        </div>
        <button
          type="button"
          disabled
          title="Mileage recording is not available yet"
          className="cursor-not-allowed px-3 text-sm text-muted-foreground/70"
        >
          Record Mileage
        </button>
      </div> */}

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="grid flex-1 content-start gap-x-10 gap-y-8 p-4 sm:p-5 min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.95fr)] lg:p-6">
          <section aria-label="Expense details" className="space-y-4">
            {activeAccounts.length === 0 && (
              <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                No active financial account is available. Add an account before recording this expense.
              </div>
            )}

            <div className={rowClassName}>
              <Label htmlFor="expense-date" className="text-xs font-normal">
                Date<span className="text-destructive">*</span>
              </Label>
              <Input
                id="expense-date"
                name="expenseDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
                className="h-9 bg-background text-sm"
              />
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-category" className="text-xs font-normal">
                Category Name<span className="text-destructive">*</span>
              </Label>
              <div className="space-y-1">
                <ExpenseCategoryCombobox
                  selectedCategory={selectedCategory}
                  onValueChange={setSelectedCategory}
                  onCreateCategory={() => setCreateCategoryOpen(true)}
                />
              </div>
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-amount" className="text-xs font-normal">
                Amount<span className="text-destructive">*</span>
              </Label>
              <div className="flex min-w-0">
                <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-xs text-muted-foreground">
                  INR ₹
                </span>
                <Input
                  id="expense-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  max="9999999999.99"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="h-9 min-w-0 rounded-l-none bg-background text-sm"
                />
              </div>
            </div>

            <fieldset className={rowClassName}>
              <legend className="text-xs">
                Expense Type<span className="text-destructive">*</span>
              </legend>
              <div className="flex h-9 items-center gap-5 text-xs">
                {(["GOODS", "SERVICES"] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="expenseTypeChoice"
                      value={type}
                      checked={expenseType === type}
                      onChange={() => setExpenseType(type)}
                      className="accent-primary"
                    />
                    {type === "GOODS" ? "Goods" : "Services"}
                  </label>
                ))}
              </div>
            </fieldset>
            <input type="hidden" name="expenseType" value={expenseType} />

            <div className={rowClassName}>
              <Label htmlFor="expense-sac" className="text-xs font-normal">SAC</Label>
              <Input id="expense-sac" name="sacCode" maxLength={20} className="h-9 bg-background text-sm" />
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-gst-treatment" className="text-xs font-normal">
                GST Treatment<span className="text-destructive">*</span>
              </Label>
              <input type="hidden" name="gstTreatment" value={gstTreatment} />
              <Popover
                open={gstTreatmentOpen}
                onOpenChange={(open) => {
                  setGstTreatmentOpen(open);
                  if (!open) setGstTreatmentSearch("");
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    id="expense-gst-treatment"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={gstTreatmentOpen}
                    aria-required="true"
                    className={`${fieldClassName} justify-between text-left font-normal`}
                  >
                    <span className="truncate">
                      {selectedGstTreatment?.[1] ?? "Select GST treatment"}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-2"
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={gstTreatmentSearch}
                      onChange={(event) => setGstTreatmentSearch(event.target.value)}
                      placeholder="Search GST treatments"
                      aria-label="Search GST treatments"
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  <div role="listbox" aria-label="GST treatments" className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                    {filteredGstTreatments.length ? filteredGstTreatments.map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        role="option"
                        aria-selected={gstTreatment === value}
                        className={`flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground ${gstTreatment === value ? "bg-accent text-accent-foreground" : ""}`}
                        onClick={() => {
                          setGstTreatment(value);
                          setGstTreatmentOpen(false);
                          setGstTreatmentSearch("");
                        }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{label}</span>
                          <span className="mt-0.5 block whitespace-normal text-muted-foreground">{description}</span>
                        </span>
                        {gstTreatment === value && <Check className="mt-0.5 size-4 shrink-0" />}
                      </button>
                    )) : (
                      <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">No GST treatments found.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-source-supply" className="text-xs font-normal">
                Source of Supply<span className="text-destructive">*</span>
              </Label>
              <select id="expense-source-supply" name="sourceOfSupply" required defaultValue="" className={fieldClassName}>
                <option value="" disabled>State / Province</option>
                {supplyStates.map(([code, name]) => <option key={code} value={code}>[{code}] - {name}</option>)}
              </select>
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-destination-supply" className="text-xs font-normal">
                Destination of Supply<span className="text-destructive">*</span>
              </Label>
              <select id="expense-destination-supply" name="destinationOfSupply" required defaultValue="TN" className={fieldClassName}>
                <option value="" disabled>State / Province</option>
                {supplyStates.map(([code, name]) => <option key={code} value={code}>[{code}] - {name}</option>)}
              </select>
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-reverse-charge" className="text-xs font-normal">Reverse Charge</Label>
              <label className="flex min-h-9 items-center gap-2 text-xs">
                <input id="expense-reverse-charge" name="reverseCharge" type="checkbox" className="size-4 accent-primary" />
                This transaction is applicable for reverse charge
              </label>
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-tax-rate" className="text-xs font-normal">Tax</Label>
              <select
                id="expense-tax-rate"
                name="taxRate"
                value={taxRate}
                onChange={(event) => setTaxRate(event.target.value)}
                className={fieldClassName}
              >
                <option value="">Select a Tax</option>
                <option value="0">Non-Taxable</option>
                <optgroup label="Tax">
                  {[0, 5, 12, 18, 28].map((rate) => (
                    <option key={rate} value={rate}>IGST{rate} [{rate}%]</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <fieldset className={rowClassName}>
              <legend className="text-xs">Amount Is</legend>
              <div className="flex h-9 items-center gap-5 text-xs">
                {[
                  ["false", "Tax Exclusive"],
                  ["true", "Tax Inclusive"],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="taxInclusiveChoice"
                      value={value}
                      checked={taxInclusive === value}
                      onChange={() => setTaxInclusive(value)}
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <input type="hidden" name="taxInclusive" value={taxInclusive} />

            <div className={rowClassName}>
              <Label htmlFor="expense-invoice-number" className="text-xs font-normal">
                Invoice #<span className="text-destructive">*</span>
              </Label>
              <Input id="expense-invoice-number" name="invoiceNumber" required maxLength={120} className="h-9 bg-background text-sm" />
            </div>

            <div className={rowClassName}>
              <Label htmlFor="expense-notes" className="text-xs font-normal">Notes</Label>
              <Textarea id="expense-notes" name="notes" placeholder="Max. 500 characters" maxLength={500} rows={3} className="min-h-16 bg-background text-sm" />
            </div>

            <div className="mt-6 border-y py-4">
              <div className={rowClassName}>
                <Label htmlFor="expense-customer" className="text-xs font-normal">Customer Name</Label>
                <div className="flex min-w-0 gap-1">
                  <div className="min-w-0 flex-1">
                    <CustomerCombobox
                      value={selectedCustomer?.id}
                      selectedCustomer={selectedCustomer}
                      onValueChange={setSelectedCustomer}
                    />
                  </div>
                  {selectedCustomer && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Clear selected customer"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <X />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    aria-label="Create customer"
                    onClick={() => setCreateCustomerOpen(true)}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section aria-label="Receipt upload" className="w-full min-w-0 space-y-3">
              <div>
                <p className="text-sm font-medium">Receipt or invoice</p>
                <p className="mt-1 text-xs text-muted-foreground">Attach supporting documentation to this expense.</p>
              </div>
              <ExpenseAttachmentUpload
                value={attachment}
                onChange={setAttachment}
                disabled={isSaving}
              />
            </section>

            <section className="space-y-4 border-t pt-4">
              <h2 className="text-sm font-medium">Payment details</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="expense-account" className="text-xs">
                    Paid from account<span className="text-destructive">*</span>
                  </Label>
                  <select id="expense-account" name="financialAccountId" required defaultValue="" disabled={activeAccounts.length === 0} className={fieldClassName}>
                    <option value="" disabled>Select an account</option>
                    {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expense-payment-method" className="text-xs">
                    Payment method<span className="text-destructive">*</span>
                  </Label>
                  <select id="expense-payment-method" name="paymentMethod" defaultValue="BANK_TRANSFER" className={fieldClassName}>
                    {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expense-vendor" className="text-xs">Vendor or recipient</Label>
                  <Input id="expense-vendor" name="vendorName" maxLength={160} placeholder="Business or person" className="h-9 bg-background text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expense-status" className="text-xs">
                    Status<span className="text-destructive">*</span>
                  </Label>
                  <select id="expense-status" name="status" defaultValue="COMPLETED" className={fieldClassName}>
                    <option value="COMPLETED">Completed — already paid</option>
                    <option value="PENDING">Pending — not paid yet</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Pending expenses do not reduce account balances.</p>
            </section>
          </aside>
        </div>

        <footer className="sticky bottom-[calc(4rem_+_env(safe-area-inset-bottom))] z-10 flex flex-col-reverse gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-start sm:px-5 md:bottom-0">
          <Button type="submit" value="save" disabled={isSaving || activeAccounts.length === 0}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
          <Button type="submit" value="new" variant="outline" disabled={isSaving || activeAccounts.length === 0}>
            Save and New
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/finance")}>
            Cancel
          </Button>
        </footer>
      </form>

      <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
        <DialogContent className="flex max-h-[94dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[530px]">
          <DialogHeader className="shrink-0 border-b bg-background px-5 py-4">
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            presentation="dialog"
            onCreated={(customer) => {
              setSelectedCustomer(customer);
              setCreateCustomerOpen(false);
            }}
            onCancel={() => setCreateCustomerOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <CreateExpenseCategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onCreated={handleCategoryCreated}
      />
    </main>
  );
}
