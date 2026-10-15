"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { CreateCustomer } from "@/actions/customer";
import { createExpense } from "@/actions/finance";
import { CustomerCombobox, type CustomerOption } from "@/components/customers/customer-combobox";
import { ExpenseAttachmentUpload } from "@/components/finance/expense-attachment-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type Account = {
  id: string;
  name: string;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
  isActive: boolean;
};

type Props = {
  accounts: Account[];
  categories: Category[];
  uploadFolder: string;
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

function CreateConsumerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (customer: CustomerOption) => void;
}) {
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSaving(true);

    try {
      const response = await CreateCustomer({
        displayName: String(formData.get("displayName") ?? "").trim(),
        customerType: formData.get("customerType") === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS",
        companyName: String(formData.get("companyName") ?? "").trim() || undefined,
        primaryContactName: String(formData.get("primaryContactName") ?? "").trim() || undefined,
      });

      if (!("customer" in response) || !response.customer) {
        toast.error(response.message);
        return;
      }

      onCreated(response.customer);
      toast.success("Consumer created");
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error("Could not create this consumer. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create consumer</DialogTitle>
          <DialogDescription>
            Add a customer record and select it for this expense.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expense-consumer-name">Consumer name *</Label>
            <Input id="expense-consumer-name" name="displayName" required maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-consumer-type">Consumer type</Label>
            <select
              id="expense-consumer-type"
              name="customerType"
              defaultValue="BUSINESS"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="BUSINESS">Business</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-consumer-company">Company name</Label>
            <Input id="expense-consumer-company" name="companyName" maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-consumer-contact">Contact name</Label>
            <Input id="expense-consumer-contact" name="primaryContactName" maxLength={160} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating…" : "Create and select"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseEntryForm({ accounts, categories, uploadFolder }: Props) {
  const router = useRouter();
  const [createConsumerOpen, setCreateConsumerOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedConsumer, setSelectedConsumer] = React.useState<CustomerOption | null>(null);
  const [attachment, setAttachment] = React.useState<{
    url: string;
    publicId: string;
    resourceType: "image" | "raw";
  } | null>(null);
  const activeAccounts = accounts.filter((account) => account.isActive);
  const activeCategories = categories.filter((category) => category.isActive);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSaving(true);

    try {
      const response = await createExpense({
        description: formData.get("description"),
        amount: formData.get("amount"),
        expenseDate: formData.get("expenseDate"),
        categoryId: formData.get("categoryId"),
        financialAccountId: formData.get("financialAccountId"),
        paymentMethod: formData.get("paymentMethod"),
        vendorName: formData.get("vendorName"),
        referenceNumber: formData.get("referenceNumber"),
        notes: formData.get("notes"),
        status: formData.get("status"),
        customerId: selectedConsumer?.id ?? null,
        receiptUrl: attachment?.url ?? null,
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      toast.success("Expense recorded");
      router.push("/dashboard/finance");
      router.refresh();
    } catch {
      toast.error("Could not save this expense. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const canRecord = activeAccounts.length > 0 && activeCategories.length > 0;
  const selectClassName = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-8">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/finance">
            <ArrowLeft />
            Back to finance
          </Link>
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">Finance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Record an expense</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Add a business expense and its payment details. Completed expenses reduce the account balance.
          </p>
        </div>
      </div>

      {!canRecord ? (
        <div role="alert" className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          {activeAccounts.length === 0
            ? "No active financial account is available. Add a company bank account or set up Office Cash before recording an expense."
            : "No active expense categories are available."}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Expense details</CardTitle>
            <CardDescription>Fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="expense-description">Expense description *</Label>
                  <Input id="expense-description" name="description" placeholder="e.g. October office rent" required maxLength={160} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount (₹) *</Label>
                  <Input id="expense-amount" name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Expense date *</Label>
                  <Input id="expense-date" name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-category">Category *</Label>
                  <select id="expense-category" name="categoryId" required defaultValue="" className={selectClassName}>
                    <option value="" disabled>Select a category</option>
                    {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-account">Paid from account *</Label>
                  <select id="expense-account" name="financialAccountId" required defaultValue="" className={selectClassName}>
                    <option value="" disabled>Select an account</option>
                    {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-payment-method">Payment method *</Label>
                  <select id="expense-payment-method" name="paymentMethod" defaultValue="BANK_TRANSFER" className={selectClassName}>
                    {paymentMethods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-vendor">Vendor or recipient</Label>
                  <Input id="expense-vendor" name="vendorName" placeholder="Name of business or person" maxLength={160} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="expense-consumer">Consumer (optional)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <CustomerCombobox
                        value={selectedConsumer?.id}
                        selectedCustomer={selectedConsumer}
                        onValueChange={setSelectedConsumer}
                      />
                    </div>
                    {selectedConsumer && (
                      <Button
                        type="button"
                        variant="outline"
                        aria-label="Clear selected consumer"
                        onClick={() => setSelectedConsumer(null)}
                      >
                        <X />
                        Clear
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => setCreateConsumerOpen(true)}>
                      <Plus />
                      New consumer
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-reference">Reference number</Label>
                  <Input id="expense-reference" name="referenceNumber" placeholder="Receipt or transaction ID" maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-status">Status *</Label>
                  <select id="expense-status" name="status" defaultValue="COMPLETED" className={selectClassName}>
                    <option value="COMPLETED">Completed — already paid</option>
                    <option value="PENDING">Pending — not paid yet</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Pending expenses do not reduce account balances.</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Attachment (optional)</Label>
                  <ExpenseAttachmentUpload
                    value={attachment}
                    onChange={setAttachment}
                    folder={uploadFolder}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="expense-notes">Notes</Label>
                  <Textarea id="expense-notes" name="notes" placeholder="Optional details" maxLength={1000} rows={4} />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard/finance">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save expense"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <CreateConsumerDialog
        open={createConsumerOpen}
        onOpenChange={setCreateConsumerOpen}
        onCreated={setSelectedConsumer}
      />
    </main>
  );
}
