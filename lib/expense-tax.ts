export const MAX_EXPENSE_TOTAL_CENTS = 999_999_999_999;

export function parseExpenseAmountCents(amount: string) {
  const match = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(amount);
  if (!match) {
    throw new RangeError("Expense amount must have up to two decimal places");
  }

  const wholeAmountCents = Number(match[1]) * 100;
  const fractionalAmountCents = Number((match[2] ?? "").padEnd(2, "0"));
  return wholeAmountCents + fractionalAmountCents;
}

export function calculateExpenseTotals(
  enteredAmountCents: number,
  taxRate: number | null | undefined,
  taxInclusive: boolean,
) {
  const rate = taxRate ?? 0;
  const taxAmountCents = rate === 0
    ? 0
    : Math.round(
      taxInclusive
        ? (enteredAmountCents * rate) / (100 + rate)
        : (enteredAmountCents * rate) / 100,
    );

  return {
    baseAmountCents: taxInclusive
      ? enteredAmountCents - taxAmountCents
      : enteredAmountCents,
    taxAmountCents,
    totalAmountCents: taxInclusive
      ? enteredAmountCents
      : enteredAmountCents + taxAmountCents,
  };
}
