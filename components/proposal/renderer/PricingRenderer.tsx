import React from "react";
import "./proposal-renderer.css";

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
    return val.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
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
      <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">{block.title || "Pricing & Financial Summary"}</h2>

      {services.length === 0 ? (
        <div className="py-8 text-center text-gray-500 italic border rounded-lg bg-gray-50">
          No services included in this proposal.
        </div>
      ) : (
        <div className="space-y-10">
          {/* Services & Line Items */}
          {services.map((service, idx) => (
            <div key={service.id} className="break-inside-avoid">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {idx + 1}. {service.serviceName}
                </h3>
                {service.packageName && (
                  <p className="text-sm text-gray-500 font-medium mt-1">Package: {service.packageName}</p>
                )}
                {service.description && (
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{service.description}</p>
                )}
              </div>

              <table className="proposal-table">
                <thead>
                  <tr>
                    <th className="w-[45%]">Item & Description</th>
                    <th className="text-center w-[15%]">Qty & Unit</th>
                    <th className="text-right w-[20%]">Unit Rate</th>
                    <th className="text-right w-[20%]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {service.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{item.description}</div>
                        )}
                      </td>
                      <td className="text-center whitespace-nowrap">
                        {item.quantity} {item.unit || "Unit"}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {formatCurrency(item.unitPrice)}
                        <span className="text-gray-400 text-xs ml-1">{formatCycle(item.billingCycle)}</span>
                      </td>
                      <td className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

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
                      <span className="font-medium">{bankAccount.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Name</span>
                      <span className="font-medium">{bankAccount.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Number</span>
                      <span className="font-medium font-mono">{bankAccount.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IFSC Code</span>
                      <span className="font-medium">{bankAccount.ifscCode}</span>
                    </div>
                    {bankAccount.swiftCode && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">SWIFT Code</span>
                        <span className="font-medium">{bankAccount.swiftCode}</span>
                      </div>
                    )}
                    {bankAccount.upiId && (
                      <div className="flex justify-between mt-4 border-t pt-2">
                        <span className="text-gray-500">UPI ID</span>
                        <span className="font-medium">{bankAccount.upiId}</span>
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
