"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, ExternalLink, PackageOpen } from "lucide-react";
import Link from "next/link";

interface PricingBlockViewerProps {
  proposal: {
    id: string;
    subtotal: number;
    discount: number;
    tax: number;
    roundOff: number;
    grandTotal: number;
    proposalServices?: Array<{
      id: string;
      serviceName: string;
      packageName?: string | null;
      items: Array<{
        id: string;
        name: string;
        description?: string | null;
        quantity: number;
        unit: string;
        unitPrice: number;
        total: number;
        billingCycle: string;
      }>;
    }>;
  };
}

export function PricingBlockViewer({ proposal }: PricingBlockViewerProps) {
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
      case "MONTHLY":
        return "/ mo";
      case "QUARTERLY":
        return "/ qtr";
      case "YEARLY":
        return "/ yr";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 border rounded-xl p-6 bg-card/50">
      {/* Banner Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold">Pricing Engine Source of Truth</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              This table renders live financial data directly from your Pricing Engine. Pricing cannot be modified inside the composer.
            </p>
          </div>
        </div>

        <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0 shadow-xs">
          <Link href={`/dashboard/proposals/${proposal.id}/builder`}>
            <span>Edit in Pricing Engine</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Services and Items Tables */}
      {services.length === 0 ? (
        <div className="text-center py-10 border border-dashed rounded-lg bg-muted/20">
          <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No services or packages imported yet.</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Import service packages in the Pricing Engine to populate this section.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/proposals/${proposal.id}/builder`}>Open Pricing Builder</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {services.map((service, idx) => (
            <div key={service.id} className="border rounded-lg overflow-hidden bg-background">
              {/* Service Section Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {idx + 1}. {service.serviceName}
                  </span>
                  {service.packageName && (
                    <Badge variant="outline" className="text-[11px] font-normal bg-background">
                      📦 {service.packageName}
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs font-mono font-medium">
                  {service.items.length} {service.items.length === 1 ? "Item" : "Items"}
                </Badge>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 text-[11px] uppercase tracking-wider">
                      <TableHead className="w-[45%]">Item & Description</TableHead>
                      <TableHead className="text-center w-[15%]">Qty & Unit</TableHead>
                      <TableHead className="text-right w-[20%]">Unit Rate</TableHead>
                      <TableHead className="text-right w-[20%]">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {service.items.map((item) => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="font-medium py-3">
                          <div className="space-y-0.5">
                            <span className="text-foreground">{item.name}</span>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3">
                          <span className="font-mono">
                            {item.quantity} {item.unit || "Unit"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono py-3">
                          {formatCurrency(item.unitPrice)} {formatCycle(item.billingCycle)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground py-3">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Financial Summary Box */}
      <div className="flex justify-end pt-2">
        <div className="w-full sm:w-80 rounded-xl border bg-muted/20 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-foreground">
              {formatCurrency(proposal.subtotal)}
            </span>
          </div>

          {proposal.discount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Total Discount</span>
              <span className="font-mono">- {formatCurrency(proposal.discount)}</span>
            </div>
          )}

          {proposal.tax > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Estimated Tax (GST)</span>
              <span className="font-mono font-medium text-foreground">
                + {formatCurrency(proposal.tax)}
              </span>
            </div>
          )}

          {proposal.roundOff !== 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Round Off</span>
              <span className="font-mono">{formatCurrency(proposal.roundOff)}</span>
            </div>
          )}

          <div className="border-t pt-2.5 flex justify-between items-center text-sm font-bold text-foreground">
            <span>Grand Total</span>
            <span className="font-mono text-base text-primary">
              {formatCurrency(proposal.grandTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
