"use client";

import { PricingApi, PricingData } from "./types";
import { Badge } from "@/components/ui/badge";
import { Receipt, Sparkles, ShieldCheck } from "lucide-react";

interface PricingSummaryCardProps {
  pricingApi: PricingApi;
  entityId: string;
  subtotal: number;
  initialDiscount: number;
  initialTax: number;
  roundOff?: number;
  grandTotal: number;
  currency?: string;
  onRefresh?: () => void;
}

export function PricingSummaryCard({ pricingApi,
  subtotal,
  initialDiscount,
  initialTax,
  roundOff = 0,
  grandTotal,
  currency = "INR",
}: PricingSummaryCardProps) {
  const symbol = currency === "INR" ? "₹" : "$";

  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-background via-background to-muted/20 p-6 shadow-md relative overflow-hidden">
      <div className="absolute top-0 right-0 size-48 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Receipt className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
              <span>Financial Summary</span>
              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary hover:bg-primary/15 font-mono">
                Auto-Synced
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Calculated dynamically from individual line item taxes and discounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border/40">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>Line-Item GST Active</span>
        </div>
      </div>

      <div className="space-y-3.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Gross Subtotal</span>
          <span className="font-mono font-semibold text-foreground">
            {symbol}{subtotal.toLocaleString("en-IN", { minimumFractionDigits: subtotal % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
          </span>
        </div>

        {initialDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Total Discount</span>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-1.5">
                Synced from items
              </Badge>
            </div>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              -{symbol}{initialDiscount.toLocaleString("en-IN", { minimumFractionDigits: initialDiscount % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-600 dark:text-amber-400 font-medium">Total Tax / GST</span>
            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-1.5 font-mono">
              [0, 5, 12, 18, 28]%
            </Badge>
          </div>
          <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
            +{symbol}{initialTax.toLocaleString("en-IN", { minimumFractionDigits: initialTax % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}
          </span>
        </div>

        {roundOff !== 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Auto Round Off</span>
              <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-border px-1.5 font-mono">
                To nearest integer
              </Badge>
            </div>
            <span className="font-mono font-semibold text-muted-foreground">
              {roundOff > 0 ? `+${symbol}${roundOff.toFixed(2)}` : `-${symbol}${Math.abs(roundOff).toFixed(2)}`}
            </span>
          </div>
        )}

        <div className="border-t border-dashed border-border/80 pt-4 mt-2 flex items-baseline justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Grand Total Payable
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Sparkles className="size-3 text-primary" />
              <span>Inclusive of applicable taxes</span>
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-primary font-mono">
            {symbol}{grandTotal.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
