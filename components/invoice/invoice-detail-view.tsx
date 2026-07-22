"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getInvoiceById, getPublicInvoiceById, recordInvoicePayment, updateInvoiceStatus, sendInvoiceEmailAction, softDeleteInvoice } from "@/actions/invoice";
import { invoiceKeys } from "@/components/invoice/util";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeftIcon, CreditCardIcon, CheckCircle2Icon, Loader2Icon, DownloadIcon, MailIcon, MessageCircleIcon, PencilIcon, Trash2Icon, HistoryIcon } from "lucide-react";
import Link from "next/link";
import { PaymentMethodType } from "@/lib/schemas/invoice-schema";

function getImageUrl(field: any): string | null {
  if (!field) return null;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return parsed.url || null;
    } catch {
      return null;
    }
  }
  if (typeof field === "object" && field.url) {
    return field.url;
  }
  return null;
}

export function InvoiceDetailView({ invoiceId, isPdfMode = false }: { invoiceId: string; isPdfMode?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodType>("BANK_TRANSFER");
  const [refId, setRefId] = useState("");
  const [notes, setNotes] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: invoiceKeys.detail(invoiceId),
    queryFn: () => (isPdfMode ? getPublicInvoiceById(invoiceId) : getInvoiceById(invoiceId)),
  });

  const invoice = data?.success ? data.data : null;
  console.log(invoice)

  const paymentMutation = useMutation({
    mutationFn: () =>
      recordInvoicePayment({
        invoiceId,
        amount: Number(amount),
        paymentMethod: method,
        paymentDate: new Date(),
        referenceId: refId,
        notes,
      }),
    onSuccess: () => {
      setPaymentOpen(false);
      setAmount("");
      setRefId("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: any) => updateInvoiceStatus(invoiceId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteInvoice(invoiceId),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(res.message || "Invoice deleted!");
        router.push("/dashboard/invoices");
      } else {
        toast.error(res.message || "Failed to delete invoice");
      }
    },
    onError: () => {
      toast.error("Failed to delete invoice");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/invoices">Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  const balance = invoice.grandTotal - invoice.amountPaid;
  const symbol = invoice.currency === "USD" ? "$" : "₹";

  const companyLogoUrl = getImageUrl(invoice.company?.logo);
  const companySignatureUrl = getImageUrl(invoice.company?.signatureImage);
  const companySealUrl = getImageUrl(invoice.company?.sealImage);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const invNum = String(invoice.invoiceNumber).padStart(4, "0");
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-INV-${invNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Failed to download PDF:", error);
    } finally {
      setDownloading(false);
    }
  };

  const clientEmail = invoice?.customer?.primaryContactEmail;

  const handleWhatsAppShare = async () => {
    const url = `${window.location.origin}/i/${invoiceId}`;
    const text = encodeURIComponent(`Here is your invoice INV-${String(invoice.invoiceNumber).padStart(4, "0")}: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");

    if (invoice.status === "DRAFT") {
      statusMutation.mutate("SENT");
    }
  };

  const handleEmailShare = async () => {
    if (!clientEmail) return;
    setSendingEmail(true);
    const url = `${window.location.origin}/i/${invoiceId}`;
    try {
      const res = await sendInvoiceEmailAction(invoiceId, clientEmail, url);
      if (res.success) {
        toast.success("Invoice email sent!");
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      } else {
        toast.error(res.message || "Failed to send email");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className={`space-y-6 max-w-5xl mx-auto ${isPdfMode ? "p-0 bg-white" : "pb-12"}`}>
      {/* Header Actions */}
      {!isPdfMode && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard/invoices">
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  INV-{String(invoice.invoiceNumber).padStart(4, "0")}
                </h1>
                <Badge variant={invoice.status === "PAID" ? "default" : "outline"}>
                  {invoice.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{invoice.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="gap-2"
            >
              {downloading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <DownloadIcon className="h-4 w-4" />
              )}
              Download PDF
            </Button>

            {clientEmail && (
              <Button
                variant="outline"
                onClick={handleEmailShare}
                disabled={sendingEmail}
                className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {sendingEmail ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <MailIcon className="h-4 w-4" />
                )}
                Send Mail
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleWhatsAppShare}
              className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
            >
              <MessageCircleIcon className="h-4 w-4" />
              WhatsApp
            </Button>

            {invoice.status !== "PAID" && (
              <Button variant="outline" asChild className="gap-2">
                <Link href={`/dashboard/invoices/${invoiceId}/edit`}>
                  <PencilIcon className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}

            {invoice.status === "DRAFT" && (
              <Button
                onClick={() => statusMutation.mutate("SENT")}
                disabled={statusMutation.isPending}
                className="gap-2"
              >
                <CheckCircle2Icon className="h-4 w-4" /> Mark as Sent
              </Button>
            )}

            {invoice.status !== "PAID" && balance > 0 && (
              <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <CreditCardIcon className="h-4 w-4" /> Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Payment Amount ({symbol})</label>
                      <Input
                        type="number"
                        max={balance}
                        placeholder={`Max ${symbol}${balance.toLocaleString("en-IN")}`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Payment Method</label>
                      <Select value={method} onValueChange={(val: any) => setMethod(val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                          <SelectItem value="CHEQUE">Cheque</SelectItem>
                          <SelectItem value="CASH">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Transaction Reference ID</label>
                      <Input
                        placeholder="e.g. UTR / Transaction #"
                        value={refId}
                        onChange={(e) => setRefId(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={() => paymentMutation.mutate()}
                      disabled={!amount || Number(amount) <= 0 || paymentMutation.isPending}
                      className="w-full"
                    >
                      {paymentMutation.isPending ? (
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                      ) : (
                        "Submit Payment"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {invoice.status !== "PAID" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this invoice?")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/20"
              >
                <Trash2Icon className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Printable Invoice Card */}
      <Card id="invoice-printable-card" className={`bg-card ${isPdfMode ? "p-6 space-y-5 border-none shadow-none bg-white" : "p-6 md:p-10 space-y-8 shadow-sm border"}`}>
        <div className="flex justify-between items-start gap-6 border-b pb-4">
          <div className="flex items-start gap-4">
            {companyLogoUrl && (
              <img
                src={companyLogoUrl}
                alt="Company Logo"
                crossOrigin="anonymous"
                className="h-16 max-w-[180px] object-contain rounded-md"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{invoice.company?.legalName || invoice.company?.displayName || "Bindzo8 CRM"}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.company?.address}</p>
              {invoice.company?.gstNumber && <p className="text-sm text-muted-foreground">GST: {invoice.company.gstNumber}</p>}
              {invoice.company?.email && <p className="text-sm text-muted-foreground">Email: {invoice.company.email}</p>}
            </div>
          </div>

          <div className="text-left md:text-right">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">INVOICE</h2>
            <p className="text-sm font-medium text-foreground">
              INV-{String(invoice.invoiceNumber).padStart(4, "0")}
            </p>
            <p className="text-xs text-muted-foreground">
              Issued: {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
            </p>
            {invoice.dueDate && (
              <p className="text-xs text-muted-foreground">
                Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {/* Client & Bank Details */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billed To</h3>
            <div className="font-semibold text-base">{invoice.customerDisplayName}</div>
            {invoice.customerCompanyName && (
              <div className="text-sm text-muted-foreground">{invoice.customerCompanyName}</div>
            )}
            <div className="text-sm text-muted-foreground mt-1">
              {invoice.customer.primaryContactEmail && <div>{invoice.customer.primaryContactEmail}</div>}
              {invoice.customer.primaryContactPhone && (
                <div className="font-mono text-sm font-medium tracking-normal mt-0.5">{invoice.customer.primaryContactPhone}</div>
              )}
            </div>
          </div>

          {invoice.bankAccount && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground tracking-wider mb-2 uppercase">Payment Details</h3>
              <div className="text-sm font-medium uppercase">{invoice.bankAccount.bankName}</div>
              <div className="text-sm text-muted-foreground">Account Name: <span className="uppercase">{invoice.bankAccount.accountName}</span></div>
              <div className="text-sm text-muted-foreground">Account No: <span className="uppercase font-mono">{invoice.bankAccount.accountNumber}</span></div>
              <div className="text-sm text-muted-foreground">IFSC: <span className="uppercase font-mono">{invoice.bankAccount.ifscCode}</span></div>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Item & Description</th>
                <th className="text-center p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Rate</th>
                <th className="text-right p-3 font-medium">Tax %</th>
                <th className="text-right p-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.lineItems.map((item: any) => (
                <tr key={item.id}>
                  <td className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{item.name}</span>
                      {(item.servicePackage?.service?.name || item.servicePackage?.name) && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.servicePackage?.service?.name || item.servicePackage?.name}
                        </span>
                      )}
                      {item.billingCycle && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          {item.billingCycle.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                    )}
                  </td>
                  <td className="p-3 text-center">{item.quantity} {item.unit}</td>
                  <td className="p-3 text-right">{symbol}{item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right">{item.taxRate}%</td>
                  <td className="p-3 text-right font-medium">{symbol}{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Payments */}
        <div className="flex justify-between items-start gap-6 pt-4 border-t">
          <div className="space-y-2 text-sm text-muted-foreground max-w-md">
            {invoice.notes && (
              <div>
                <span className="font-medium text-foreground">Notes: </span> {invoice.notes}
              </div>
            )}
            {invoice.terms && (
              <div>
                <span className="font-medium text-foreground">Terms: </span> {invoice.terms}
              </div>
            )}
          </div>

          <div className="w-full md:w-72 space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{symbol}{invoice.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax Amount</span>
              <span>{symbol}{invoice.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Discount</span>
                <span>-{symbol}{invoice.discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t text-gray-900">
              <span>Grand Total</span>
              <span>{symbol}{invoice.grandTotal.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-medium">
              <span>Paid</span>
              <span>{symbol}{invoice.amountPaid.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t">
              <span>Balance Due</span>
              <span>{symbol}{Math.max(0, balance).toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Company Signature & Seal Block */}
        <div className={`border-t flex justify-between items-end gap-6 break-inside-avoid ${isPdfMode ? "pt-4" : "pt-8"}`}>
          <div className="text-xs text-muted-foreground max-w-sm space-y-1">
            <p className="font-semibold text-foreground">Thank you for your business!</p>
            <p>This invoice is electronically generated and verified with authorized signature & seal.</p>
          </div>

          <div className="w-64 space-y-2 text-right">
            <div className={`relative border-b border-gray-400 flex items-end justify-end pb-2 ${isPdfMode ? "h-20" : "h-24"}`}>
              {companySealUrl && (
                <img
                  src={companySealUrl}
                  alt="Company Seal"
                  crossOrigin="anonymous"
                  className="max-h-24 max-w-[120px] object-contain absolute bottom-0 right-6 opacity-60 z-0 mix-blend-multiply pointer-events-none"
                />
              )}
              {companySignatureUrl ? (
                <img
                  src={companySignatureUrl}
                  alt="Company Signature"
                  crossOrigin="anonymous"
                  className="max-h-20 max-w-[180px] object-contain relative z-10"
                />
              ) : (
                <span className="text-xs text-muted-foreground italic relative z-10">
                  Authorized Signature
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {invoice.company?.legalName || invoice.company?.displayName || "Authorized Signatory"}
              </p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                For {invoice.company?.legalName || invoice.company?.displayName || "Company"}
              </p>
            </div>
          </div>
        </div>

        {/* Payments Audit List */}
        {invoice.payments.length > 0 && (
          <div className="pt-6 border-t space-y-3 print:hidden">
            <h3 className="text-sm font-semibold">Recorded Payment Transactions</h3>
            <div className="space-y-2">
              {invoice.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-md bg-muted text-xs">
                  <div>
                    <span className="font-medium">{symbol}{p.amount.toLocaleString("en-IN")}</span> via{" "}
                    <span className="font-medium">{p.paymentMethod.replace("_", " ")}</span>
                    {p.referenceId && <span className="text-muted-foreground ml-2">(Ref: {p.referenceId})</span>}
                  </div>
                  <div className="text-muted-foreground">
                    {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity & Audit Log */}
        {invoice.activities && invoice.activities.length > 0 && (
          <div className="pt-6 border-t space-y-3 print:hidden">
            <div className="flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Invoice Activity & Audit Log</h3>
            </div>
            <div className="space-y-2">
              {invoice.activities.map((act: any) => (
                <div key={act.id} className="flex items-center justify-between p-3 rounded-md bg-muted/60 border text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold px-2 py-0.5 rounded bg-gray-200 text-gray-800 text-[10px] uppercase">
                      {act.action.replace("_", " ")}
                    </span>
                    <span className="text-foreground">{act.details}</span>
                    {act.user?.name && (
                      <span className="text-muted-foreground">by {act.user.name}</span>
                    )}
                  </div>
                  <div className="text-muted-foreground whitespace-nowrap">
                    {new Date(act.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
