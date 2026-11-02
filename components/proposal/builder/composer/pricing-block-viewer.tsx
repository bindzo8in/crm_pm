"use client";
import React from "react";

import { Button } from "@/components/ui/button";
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
    currency?: string;
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
        discountValue?: number | null;
        taxRate?: number;
      }>;
    }>;
  };
}

export function PricingBlockViewer({ proposal }: PricingBlockViewerProps) {
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
      case "MONTHLY":
        return "per month";
      case "QUARTERLY":
        return "per quarter";
      case "YEARLY":
        return "per year";
      case "HALF_YEARLY":
        return "per 6 months";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <DollarSign className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm text-muted-foreground">
            Prices are managed in the pricing step. Changes here update automatically.
          </p>
        </div>

        <Button asChild size="sm" variant="outline" className="w-full shrink-0 gap-2 sm:w-auto">
          <Link href={`/dashboard/proposals/${proposal.id}/builder`}>
            <span>Edit pricing</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* Services and Items Tables */}
      {services.length === 0 ? (
        <div className="py-8 text-center">
          <PackageOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">No pricing items yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Add services or packages in the pricing step to populate this section.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/proposals/${proposal.id}/builder`}>Go to pricing</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="divide-y lg:hidden">
            {services.flatMap((service) =>
              service.items.map((item) => {
                const serviceTitle = service.serviceName.trim() === "Custom items"
                  ? ""
                  : service.serviceName.trim();
                const title = serviceTitle
                  ? service.packageName &&
                    service.packageName.trim().toLowerCase() !== serviceTitle.toLowerCase()
                    ? `${serviceTitle} (${service.packageName})`
                    : serviceTitle
                  : item.name;
                const showItemName =
                  serviceTitle &&
                  item.name &&
                  item.name.trim().toLowerCase() !== serviceTitle.toLowerCase() &&
                  (!service.packageName || item.name.trim().toLowerCase() !== service.packageName.trim().toLowerCase());

                return (
                  <article key={item.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-foreground">{title}</h3>
                        {showItemName && (
                          <p className="mt-0.5 break-words text-xs text-muted-foreground">{item.name}</p>
                        )}
                        {item.description && (
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Quantity</dt>
                        <dd className="mt-0.5 font-medium text-foreground">{item.quantity} {item.unit || "Unit"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Rate</dt>
                        <dd className="mt-0.5 font-medium text-foreground">
                          {formatCurrency(item.unitPrice)}
                          {formatCycle(item.billingCycle) && ` ${formatCycle(item.billingCycle)}`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Tax</dt>
                        <dd className="mt-0.5 font-medium text-foreground">{item.taxRate ? `${item.taxRate}%` : "—"}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 text-[11px] uppercase tracking-wider">
                  <TableHead className="w-[48%]">Description</TableHead>
                  <TableHead className="text-center w-[10%]">Qty</TableHead>
                  <TableHead className="text-right w-[14%]">Rate</TableHead>
                  <TableHead className="text-right w-[13%]">Tax</TableHead>
                  <TableHead className="text-right w-[15%]">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <React.Fragment key={service.id}>
                    {service.items.map((item) => (
                      <TableRow key={item.id} className="text-xs">
                        <TableCell className="align-top py-3">
                          <div className="space-y-0.5">
                            {service.serviceName.trim() && service.serviceName.trim() !== "Custom items" ? (
                              <>
                                <span className="font-bold text-foreground text-sm">
                                  {service.packageName
                                    ? (service.packageName.trim().toLowerCase() === service.serviceName.trim().toLowerCase()
                                        ? service.serviceName
                                        : `${service.serviceName} (${service.packageName})`)
                                    : service.serviceName}
                                </span>
                                {item.name &&
                                  item.name.trim().toLowerCase() !== service.serviceName.trim().toLowerCase() &&
                                  (!service.packageName || item.name.trim().toLowerCase() !== service.packageName.trim().toLowerCase()) && (
                                    <p className="text-xs font-medium text-foreground pt-0.5">
                                      {item.name}
                                    </p>
                                  )}
                              </>
                            ) : (
                              <span className="font-bold text-foreground text-sm">{item.name}</span>
                            )}
                            {item.description && (
                              <p className="text-[11px] text-foreground font-medium whitespace-pre-wrap leading-relaxed pt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-3 align-top font-medium">
                          <div className="font-mono">{item.quantity}</div>
                          <div className="text-[10px] font-semibold text-foreground mt-0.5">{item.unit || "Unit"}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono py-3 align-top font-semibold">
                          <div>{formatCurrency(item.unitPrice)}</div>
                          {item.billingCycle && formatCycle(item.billingCycle) && (
                            <div className="text-[10px] font-medium text-foreground mt-0.5">{formatCycle(item.billingCycle)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono py-3 align-top">
                          {item.taxRate ? `${item.taxRate}%` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground py-3 align-top">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {services.length > 0 && (
        <div className="flex justify-end border-t pt-4">
          <div className="w-full max-w-sm space-y-2.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono font-medium text-foreground">
                {formatCurrency(proposal.subtotal)}
              </span>
            </div>

            {proposal.discount > 0 && (
              <div className="flex justify-between font-medium text-emerald-600 dark:text-emerald-400">
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

            <div className="flex items-center justify-between border-t pt-3 font-bold text-foreground">
              <span>Grand Total</span>
              <span className="font-mono text-lg text-primary">
                {formatCurrency(proposal.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
