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
      }>;
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bankAccount?: any;
}

export function PricingRenderer({ block, proposal, bankAccount }: PricingRendererProps) {
  const services = proposal.proposalServices || [];

  const formatCurrency = (val: number) => {
    const currency = proposal.currency || "INR";
    return val.toLocaleString(currency === "USD" ? "en-US" : "en-IN", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 2,
    });
  };

  const formatCycle = (cycle: string) => {
    switch (cycle) {
      case "MONTHLY": return "/ mo";
      case "QUARTERLY": return "/ qtr";
      case "YEARLY": return "/ yr";
      default: return "";
    }
  };

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {block.title || "Investment Breakdown"}
          </h2>
          <p className="text-sm text-gray-500">
            Transparent pricing for your selected services and packages.
          </p>
        </div>
      </div>

      {services.length === 0 ? (
        <div className="py-8 text-center text-gray-500 italic border rounded-lg bg-gray-50">
          No services included in this quotation.
        </div>
      ) : (
        <div className="space-y-10">
          <div className="break-inside-avoid">
            <table className="proposal-table w-full">
              <thead>
                <tr>
                  <th className="w-[20%]">Service & Package</th>
                  <th className="w-[25%]">Item & Description</th>
                  <th className="text-center w-[10%]">Qty</th>
                  <th className="text-right w-[12%]">Rate</th>
                  <th className="text-right w-[10%]">Discount</th>
                  <th className="text-right w-[8%]">Tax</th>
                  <th className="text-right w-[15%]">Total</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <React.Fragment key={service.id}>
                    {/* Service Items */}
                    {service.items.map((item) => (
                      <tr key={item.id}>
                        <td className="align-top">
                          <div className="font-semibold text-gray-900">{service.serviceName}</div>
                          {service.packageName && (
                            <div className="text-xs text-gray-500 mt-1">Pkg: {service.packageName}</div>
                          )}
                        </td>
                        <td className="align-top">
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{item.description}</div>
                          )}
                        </td>
                        <td className="text-center whitespace-nowrap align-top">
                          {item.quantity} <span className="text-xs text-gray-500">{item.unit || "Unit"}</span>
                        </td>
                        <td className="text-right whitespace-nowrap align-top">
                          {formatCurrency(item.unitPrice)}
                          <div className="text-gray-400 text-[10px] mt-0.5">{formatCycle(item.billingCycle)}</div>
                        </td>
                        <td className="text-right whitespace-nowrap align-top text-gray-600">
                          {item.discountValue ? formatCurrency(item.discountValue) : "-"}
                        </td>
                        <td className="text-right whitespace-nowrap align-top text-gray-600">
                          {item.taxRate ? `${item.taxRate}%` : "-"}
                        </td>
                        <td className="text-right font-medium whitespace-nowrap align-top">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary and Bank Account */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 break-inside-avoid">
            <div>
              {bankAccount && (
                <div className="w-full rounded-lg border bg-gray-50/50 p-6 h-full">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-3">
                    Bank Details
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank Name</span>
                      <span className="font-medium uppercase">{bankAccount.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Name</span>
                      <span className="font-medium uppercase">{bankAccount.accountName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Account Number</span>
                      <div className="flex items-center">
                        <span className="font-medium font-mono uppercase">{bankAccount.accountNumber}</span>
                        <CopyButton textToCopy={bankAccount.accountNumber} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">IFSC Code</span>
                      <div className="flex items-center">
                        <span className="font-medium uppercase">{bankAccount.ifscCode}</span>
                        <CopyButton textToCopy={bankAccount.ifscCode} />
                      </div>
                    </div>
                    {bankAccount.swiftCode && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">SWIFT Code</span>
                        <div className="flex items-center">
                          <span className="font-medium uppercase">{bankAccount.swiftCode}</span>
                          <CopyButton textToCopy={bankAccount.swiftCode} />
                        </div>
                      </div>
                    )}
                    {bankAccount.upiId && (
                      <div className="flex justify-between items-center mt-4 border-t pt-2">
                        <span className="text-gray-500">UPI ID</span>
                        <div className="flex items-center">
                          <span className="font-medium">{bankAccount.upiId}</span>
                          <CopyButton textToCopy={bankAccount.upiId} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full rounded-lg border bg-gray-50/50 p-6">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-3">
                Financial Summary
              </h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(proposal.subtotal)}</span>
                </div>
                
                {proposal.discount > 0 && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span>Total Discount</span>
                    <span className="font-medium">-{formatCurrency(proposal.discount)}</span>
                  </div>
                )}
                
                {proposal.tax > 0 && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Total Tax</span>
                    <span className="font-medium text-gray-900">{formatCurrency(proposal.tax)}</span>
                  </div>
                )}
                
                {proposal.roundOff !== 0 && (
                  <div className="flex justify-between items-center text-gray-500 text-xs">
                    <span>Round Off</span>
                    <span>{formatCurrency(proposal.roundOff)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-4">
                  <span className="text-base font-bold text-gray-900">Grand Total</span>
                  <span className="text-xl font-bold text-blue-700">{formatCurrency(proposal.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
