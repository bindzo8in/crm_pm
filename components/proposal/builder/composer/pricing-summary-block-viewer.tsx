"use client";

import { PackageOpen, Check } from "lucide-react";

interface PricingSummaryBlockViewerProps {
  proposal: {
    id: string;
    currency?: string;
    proposalServices?: Array<{
      id: string;
      serviceName: string;
      packageName?: string | null;
      isStartsFrom?: boolean;
      items: Array<{
        total: number;
      }>;
      features?: Array<{
        id: string;
        content: string;
        isHeading: boolean;
      }>;
    }>;
  };
}

export function PricingSummaryBlockViewer({ proposal }: PricingSummaryBlockViewerProps) {
  const services = proposal.proposalServices || [];

  const formatCurrency = (val: number) => {
    const currency = proposal.currency || "INR";
    return val.toLocaleString(currency === "USD" ? "en-US" : "en-IN", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    });
  };

  if (services.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed rounded-lg bg-muted/20">
        <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">No services or packages imported yet.</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">
          Import service packages in the Pricing Engine to populate the comparison grid.
        </p>
      </div>
    );
  }

  // Pre-defined vibrant colors for the headers
  const headerColors = [
    "bg-sky-500",
    "bg-amber-500",
    "bg-purple-600",
    "bg-emerald-500",
    "bg-rose-500",
    "bg-indigo-500"
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {services.map((service, idx) => {
          const total = service.items.reduce((acc, item) => acc + item.total, 0);
          const colorClass = headerColors[idx % headerColors.length];
          const features = service.features || [];

          return (
            <div key={service.id} className="flex flex-col border rounded-xl overflow-hidden bg-card shadow-sm h-full">
              {/* Header */}
              <div className={`${colorClass} p-4 text-white text-center`}>
                <h3 className="font-semibold text-base">
                  {service.packageName || service.serviceName}
                </h3>
              </div>
              
              {/* Features List */}
              <div className="flex-1 p-5">
                {features.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">No features defined.</p>
                ) : (
                  <ul className="space-y-3">
                    {features.map((feature) => (
                      <li key={feature.id}>
                        {feature.isHeading ? (
                          <div className="font-semibold text-sm mt-5 mb-1 border-b pb-1 text-foreground">
                            {feature.content}
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <div className="mt-0.5 rounded-full bg-muted/50 p-0.5 shrink-0">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="leading-tight">{feature.content}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-5 border-t bg-muted/10 text-center">
                {service.isStartsFrom && (
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Starts from</p>
                )}
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(total)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">
                  + Tax
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
