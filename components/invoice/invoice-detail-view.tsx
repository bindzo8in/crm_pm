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
import { ArrowLeftIcon, CreditCardIcon, CheckCircle2Icon, Loader2Icon, DownloadIcon, MailIcon, MessageCircleIcon, PencilIcon, Trash2Icon, HistoryIcon, LandmarkIcon } from "lucide-react";
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
      <Card id="invoice-printable-card" className={`bg-card font-[family-name:var(--font-invoice)] p-5 md:p-6 space-y-3 shadow-sm border ${isPdfMode ? "p-5 space-y-3 border-none shadow-none bg-white" : ""}`}>
        <div className="flex justify-between items-start gap-6 border-b pb-2">
          <div className="flex items-start gap-4">
            {companyLogoUrl && (
              <img
                src={companyLogoUrl}
                alt="Company Logo"
                crossOrigin="anonymous"
                className="h-12 max-w-[150px] object-contain rounded-md"
              />
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{invoice.company?.legalName || invoice.company?.displayName || "Bindzo8 CRM"}</h2>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-normal">{invoice.company?.address}</p>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-mono flex items-center gap-3 flex-wrap">
                {invoice.company?.gstNumber && <div>GSTIN: {invoice.company.gstNumber}</div>}
                {invoice.company?.iecCode && <div>IEC: {invoice.company.iecCode}</div>}
                {invoice.company?.email && <div>Email: {invoice.company.email}</div>}
              </div>
            </div>
          </div>

          <div className="text-left md:text-right">
            <h2 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">
              {invoice.currency === "USD" ? "EXPORT COMMERCIAL INVOICE" : "INVOICE"}
            </h2>
            <p className="text-xs font-medium text-foreground">
              INV-{String(invoice.invoiceNumber).padStart(4, "0")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Issued: {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
            </p>
            {invoice.dueDate && (
              <p className="text-[11px] text-muted-foreground">
                Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {/* Client & Bank Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Billed To (Importer)</h3>
            <div className="font-semibold text-sm leading-snug">{invoice.customerDisplayName}</div>
            {invoice.customerCompanyName && (
              <div className="text-xs text-muted-foreground">{invoice.customerCompanyName}</div>
            )}
            <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
              {invoice.customer?.primaryContactEmail && <div>{invoice.customer.primaryContactEmail}</div>}
              {invoice.customer?.primaryContactPhone && (
                <div className="font-mono text-xs font-medium tracking-normal">{invoice.customer.primaryContactPhone}</div>
              )}
              {invoice.customer?.taxId && (
                <div className="font-mono text-[11px] font-medium text-gray-700">Client Tax ID / EIN: {invoice.customer.taxId}</div>
              )}
            </div>
          </div>

          {invoice.currency === "USD" && (
            <div className="text-xs space-y-0.5 self-start">
              <div className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                Export Compliance (LUT Route)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                <div><span className="font-semibold font-sans text-foreground">LUT ARN:</span> {invoice.company?.lutNumber || "Active LUT"}</div>
                <div><span className="font-semibold font-sans text-foreground">IEC Code:</span> {invoice.company?.iecCode || "10-digit IEC"}</div>
                <div><span className="font-semibold font-sans text-foreground">GSTIN:</span> {invoice.company?.gstNumber || "15-digit GST"}</div>
                <div><span className="font-semibold font-sans text-foreground">Place of Supply:</span> {invoice.placeOfSupply || "Foreign Country"}</div>
              </div>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="text-left py-1.5 px-2.5 font-medium">Item & Description</th>
                <th className="text-center py-1.5 px-2.5 font-medium">Qty</th>
                <th className="text-right py-1.5 px-2.5 font-medium">Rate</th>
                <th className="text-right py-1.5 px-2.5 font-medium">SAC / Tax %</th>
                <th className="text-right py-1.5 px-2.5 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.lineItems.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-1.5 px-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-foreground">{item.name}</span>
                      {item.servicePackage && (
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {item.servicePackage.service?.name && item.servicePackage.name
                            ? `${item.servicePackage.service.name} • ${item.servicePackage.name}`
                            : item.servicePackage.service?.name || item.servicePackage.name}
                        </span>
                      )}
                      {item.billingCycle && (
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-1 py-0.2 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          {item.billingCycle.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{item.description}</div>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-center">{item.quantity} {item.unit}</td>
                  <td className="py-1.5 px-2.5 text-right">{symbol}{item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td className="py-1.5 px-2.5 text-right">
                    <div className="text-[11px] font-mono font-medium text-gray-700">SAC: {item.sacCode || "9983"}</div>
                    <div className="text-[9px] text-muted-foreground">{invoice.currency === "USD" ? "0% (Nil)" : `${item.taxRate}%`}</div>
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-medium">{symbol}{item.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
            {invoice.currency === "USD" && (
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={5} className="py-1 px-2.5 text-center text-[11px] text-muted-foreground font-medium italic">
                    &ldquo;Supply meant for export under LUT without payment of Integrated Tax&rdquo;
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Totals & Payments */}
        <div className="flex justify-between items-start gap-4 pt-2.5 border-t">
          <div className="space-y-2 text-xs max-w-md">
            {invoice.notes && (
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Notes: </span> {invoice.notes}
              </div>
            )}
            {invoice.terms && (
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Terms: </span> {invoice.terms}
              </div>
            )}

            {invoice.bankAccount && (
              <div className="space-y-0.5 text-[11px] text-muted-foreground pt-0.5">
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                  <LandmarkIcon className="h-3 w-3 text-foreground" />
                  <span>Payment Details</span>
                </div>
                <div className="font-semibold text-foreground uppercase">{invoice.bankAccount.bankName}</div>
                <div>Account Name: <span className="font-medium text-foreground uppercase">{invoice.bankAccount.accountName}</span></div>
                <div>Account No: <span className="font-mono font-medium text-foreground">{invoice.bankAccount.accountNumber}</span></div>
                <div>IFSC: <span className="font-mono font-medium text-foreground uppercase">{invoice.bankAccount.ifscCode}</span></div>
                {invoice.bankAccount.swiftCode && (
                  <div>SWIFT Code (FIRC): <span className="font-mono font-semibold text-foreground">{invoice.bankAccount.swiftCode}</span></div>
                )}
              </div>
            )}
          </div>

          <div className="w-full md:w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{symbol}{invoice.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IGST / Tax</span>
              <span>{invoice.currency === "USD" ? "0% (Nil)" : `${symbol}${invoice.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Discount</span>
                <span>-{symbol}{invoice.discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1.5 border-t text-gray-900">
              <span>Grand Total</span>
              <span>{symbol}{invoice.grandTotal.toLocaleString("en-IN")}</span>
            </div>

            {invoice.currency === "USD" && (
              <div className="border-t border-dashed border-gray-300 pt-1 mt-1 text-[11px] text-gray-600 space-y-0.5">
                <div className="flex justify-between font-semibold text-gray-900">
                  <span>INR Equivalent (RBI Rate):</span>
                  <span>₹{(invoice.grandTotal * (invoice.exchangeRate || 83.5)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <a
                    href="https://www.exchangerate-api.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-600"
                  >
                    Rates by Exchange Rate API
                  </a>
                  <span>Rate: ₹{(invoice.exchangeRate || 83.5).toFixed(2)} / USD</span>
                </div>
              </div>
            )}

            <div className="flex justify-between text-gray-900 font-medium pt-2 border-t">
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
