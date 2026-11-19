import React from "react";
import "./proposal-renderer.css";
import { CopyButton } from "./CopyButton";

interface PricingRendererProps {
  block: {
    title: string | null;
  };
  proposal: {
    subtotal: number;
    discount: number;
    tax: number;
    roundOff: number;
    grandTotal: number;
    currency?: string;
    exchangeRate?: number;
    placeOfSupply?: string | null;
    company?: any;
    proposalServices?: Array<{
      id: string;
      serviceName: string;
      packageName?: string | null;
      description?: string | null;
      items: Array<{
        id: string;
        name: string;
        description?: string | null;
        quantity: number;
        unit: string;
        unitPrice: number;
        total: number;
        billingCycle: string;
        discountValue?: number | null;
        taxRate: number;
        sacCode?: string | null;
        itemType?: "GOODS" | "SERVICE";
      }>;
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bankAccount?: any;
}

export function PricingRenderer({ block, proposal, bankAccount }: PricingRendererProps) {
  const services = proposal.proposalServices || [];
  const isUSD = proposal.currency === "USD";
  const exRate = proposal.exchangeRate || 83.5;
  const inrEquivalent = proposal.grandTotal * exRate;
  const company = proposal.company;
  let itemNumber = 0;

  const formatCurrency = (val: number) => {
    const currency = proposal.currency || "INR";
    return val.toLocaleString(currency === "USD" ? "en-US" : "en-IN", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="mb-16">

      {services.length === 0 ? (
        <div className="py-8 text-center text-black font-medium italic border rounded-lg bg-gray-50">
          No services included in this quotation.
        </div>
      ) : (
        <div className="space-y-10">
          <div>
            <div className="overflow-hidden rounded-md border border-gray-300">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 text-gray-900 font-bold border-b border-gray-300">
                  <tr>
                    <th className="text-center py-2 px-2.5 font-bold w-8">#</th>
                    <th className="text-left py-2 px-2.5 font-bold">Item &amp; Description</th>
                    <th className="text-center py-2 px-2.5 font-bold">HSN / SAC code</th>
                    <th className="text-center py-2 px-2.5 font-bold">Qty</th>
                    <th className="text-right py-2 px-2.5 font-bold">Rate</th>
                    <th className="text-right py-2 px-2.5 font-bold">Tax Rate</th>
                    <th className="text-right py-2 px-2.5 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {services.map((service) => {
                    const hasServiceHeading =
                      service.serviceName.trim() !== "" &&
                      service.serviceName.trim() !== "Custom items";
                    const hasSingleItem = service.items.length === 1;
                    const serviceHeading = service.packageName
                      ? service.packageName.trim().toLowerCase() === service.serviceName.trim().toLowerCase()
                        ? service.serviceName
                        : `${service.serviceName} (${service.packageName})`
                      : service.serviceName;

                    return (
                      <React.Fragment key={service.id}>
                        {hasServiceHeading && !hasSingleItem && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="px-3 py-2 font-bold text-gray-900">
                              {serviceHeading}
                            </td>
                          </tr>
                        )}
                        {service.items.map((item) => {
                          const isNameRepeated =
                            item.name.trim().toLowerCase() === service.serviceName.trim().toLowerCase() ||
                            item.name.trim().toLowerCase() === service.packageName?.trim().toLowerCase();
                          const itemTitle = hasServiceHeading && isNameRepeated
                            ? hasSingleItem ? serviceHeading : "Service Package"
                            : hasServiceHeading && hasSingleItem
                              ? `${serviceHeading} — ${item.name}`
                              : item.name;

                          return (
                            <tr key={item.id} className="align-top">
                              <td className="py-2.5 px-2 text-center text-gray-900 font-bold text-xs">{++itemNumber}</td>
                              <td className="py-2.5 px-3">
                                {itemTitle && (
                                  <div className="font-bold text-gray-900 leading-snug">{itemTitle}</div>
                                )}
                                {item.description && (
                                  <div className="text-[11px] font-medium text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{item.description}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-[11px] font-semibold text-gray-900 whitespace-nowrap">
                                {item.sacCode || "—"}
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-900 font-semibold whitespace-nowrap">
                                <span>{item.quantity} {item.unit || "Unit"}</span>
                                {item.billingCycle && item.billingCycle !== "ONE_TIME" && (
                                  <div className="text-[10px] text-gray-700 font-bold uppercase tracking-tight">{item.billingCycle.replace("_", " ")}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right text-gray-900 font-semibold whitespace-nowrap">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap text-[11px] font-semibold text-gray-800">
                                {isUSD ? "0% (Nil)" : `${item.taxRate}%`}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export LUT Notice Banner if USD */}
          {isUSD && (
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/60 text-xs text-blue-900 space-y-1.5 break-inside-avoid">
              <div className="font-bold uppercase tracking-wider text-[11px] text-blue-950 flex items-center gap-2">
                <span>Mandatory Export Legal Endorsement (Indian GST - LUT Route)</span>
              </div>
              <p className="font-semibold italic text-blue-900">
                &ldquo;Supply meant for export under LUT without payment of Integrated Tax&rdquo;
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-blue-800 border-t border-blue-200/60">
                <div><span className="font-semibold font-sans">LUT ARN:</span> {company?.lutNumber || "Active LUT"}</div>
                <div><span className="font-semibold font-sans">IEC Code:</span> {company?.iecCode || "10-digit IEC"}</div>
                <div><span className="font-semibold font-sans">GSTIN:</span> {company?.gstNumber || "15-digit GST"}</div>
                <div><span className="font-semibold font-sans">Place of Supply:</span> {proposal.placeOfSupply || "Foreign Country"}</div>
              </div>
            </div>
          )}

          {/* Financial Summary and Bank Account */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 break-inside-avoid">
            <div>
              {bankAccount && (
                <div className="w-full rounded-lg border border-gray-300 bg-gray-50/50 p-6 h-full">
                  <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-4 border-b border-gray-300 pb-3">
                    Bank Details (Inward Remittance)
                  </h4>
                  <div className="space-y-2 text-sm text-black">
                    <div className="flex justify-between">
                      <span className="font-semibold text-black">Bank Name</span>
                      <span className="font-bold uppercase text-black">{bankAccount.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-black">Account Name</span>
                      <span className="font-bold uppercase text-black">{bankAccount.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-black">Account Number</span>
                      <div className="flex items-center">
                        <span className="font-bold uppercase font-mono text-black">{bankAccount.accountNumber}</span>
                        <CopyButton textToCopy={bankAccount.accountNumber} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-black">IFSC Code</span>
                      <div className="flex items-center">
                        <span className="font-bold uppercase font-mono text-black">{bankAccount.ifscCode}</span>
                        <CopyButton textToCopy={bankAccount.ifscCode} />
                      </div>
                    </div>
                    {bankAccount.swiftCode && (
                      <div className="flex justify-between items-center bg-gray-100 p-2 rounded border border-gray-300 mt-1">
                        <span className="text-black font-bold">SWIFT Code (FIRC)</span>
                        <div className="flex items-center">
                          <span className="font-bold uppercase font-mono text-black">{bankAccount.swiftCode}</span>
                          <CopyButton textToCopy={bankAccount.swiftCode} />
                        </div>
                      </div>
                    )}
                    {bankAccount.upiId && (
                      <div className="flex justify-between items-center mt-4 border-t border-gray-300 pt-2">
                        <span className="font-semibold text-black">UPI ID</span>
                        <div className="flex items-center">
                          <span className="font-bold text-black">{bankAccount.upiId}</span>
                          <CopyButton textToCopy={bankAccount.upiId} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full rounded-lg border border-gray-300 bg-gray-50/50 p-6">
              <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-4 border-b border-gray-300 pb-3">
                Financial Summary
              </h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-black">
                  <span className="font-semibold text-black">Subtotal</span>
                  <span className="font-bold text-black">{formatCurrency(proposal.subtotal)}</span>
                </div>
                
                {proposal.discount > 0 && (
                  <div className="flex justify-between items-center text-black">
                    <span className="font-semibold text-black">Total Discount</span>
                    <span className="font-bold text-black">-{formatCurrency(proposal.discount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-black">
                  <span className="font-semibold text-black">IGST / Tax</span>
                  <span className="font-bold text-black">
                    {isUSD ? "0% (Nil - LUT Zero-Rated Export)" : formatCurrency(proposal.tax)}
                  </span>
                </div>
                
                {proposal.roundOff !== 0 && (
                  <div className="flex justify-between items-center text-black text-xs">
                    <span className="font-semibold text-black">Round Off</span>
                    <span className="font-bold text-black">{formatCurrency(proposal.roundOff)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center border-t border-gray-300 pt-4 mt-4">
                  <span className="text-base font-bold text-black">Grand Total</span>
                  <span className="text-xl font-black text-black">{formatCurrency(proposal.grandTotal)}</span>
                </div>

                {isUSD && (
                  <div className="border-t border-dashed border-gray-300 pt-3 mt-3 text-xs text-black space-y-1">
                    <div className="flex justify-between font-bold text-black">
                      <span>INR Equivalent (RBI Rate):</span>
                      <span>₹{inrEquivalent.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-black font-medium pt-0.5">
                      <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="text-black font-semibold hover:underline">
                        Rates by Exchange Rate API
                      </a>
                      <span>Conversion Rate: ₹{exRate.toFixed(2)} / USD</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
