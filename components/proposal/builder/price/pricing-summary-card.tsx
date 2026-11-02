"use client";

interface PricingSummaryCardProps {
  proposalId: string;
  subtotal: number;
  initialDiscount: number;
  initialTax: number;
  roundOff?: number;
  grandTotal: number;
  currency?: string;
  onRefresh?: () => void;
}

export function PricingSummaryCard({
  subtotal,
  initialDiscount,
  initialTax,
  roundOff = 0,
  grandTotal,
  currency = "INR",
}: PricingSummaryCardProps) {
  const currencyCode = currency === "USD" ? "USD" : "INR";
  const formatAmount = (amount: number) => new Intl.NumberFormat(
    currencyCode === "USD" ? "en-US" : "en-IN",
    {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: amount % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    },
  ).format(amount);

  return (
    <aside
      aria-label="Pricing summary"
      className="rounded-xl border bg-card p-5"
    >
      <div className="mb-5 flex items-start justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="font-semibold">Pricing summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates as you edit line items.
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{currencyCode}</span>
      </div>

      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatAmount(subtotal)}</dd>
        </div>

        {initialDiscount > 0 && (
          <div className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="tabular-nums text-emerald-700 dark:text-emerald-400">
              −{formatAmount(initialDiscount)}
            </dd>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="tabular-nums">{formatAmount(initialTax)}</dd>
        </div>

        {roundOff !== 0 && (
          <div className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">Rounding adjustment</dt>
            <dd className="tabular-nums">
              {roundOff > 0 ? "+" : "−"}
              {formatAmount(Math.abs(roundOff))}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex items-end justify-between gap-3 border-l-2 border-primary pl-3 pt-1 sm:gap-4 sm:pl-4">
        <div>
          <p className="text-sm font-medium">Proposal total</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Including applicable taxes
          </p>
        </div>
        <p className="break-all text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
          {formatAmount(grandTotal)}
        </p>
      </div>
    </aside>
  );
}
