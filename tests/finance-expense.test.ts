import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateExpenseTotals,
  MAX_EXPENSE_TOTAL_CENTS,
  parseExpenseAmountCents,
} from "../lib/expense-tax";
import { expenseSchema } from "../lib/schemas/finance";

const validExpense = {
  description: "Office supplies",
  amount: "1250.50",
  expenseDate: "2026-10-31",
  financialAccountId: "account-1",
  categoryId: "category-1",
  sourceOfSupply: "TN",
  destinationOfSupply: "TN",
};

test("expense schema accepts a valid date and decimal amount", () => {
  const result = expenseSchema.safeParse(validExpense);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.amount, "1250.50");
    assert.equal(result.data.status, "PENDING");
    assert.equal(result.data.paymentMethod, "BANK_TRANSFER");
  }
});

test("expense schema rejects malformed and impossible calendar dates", () => {
  for (const expenseDate of ["not-a-date", "2026-02-31", "2026-2-03", ""]) {
    const result = expenseSchema.safeParse({ ...validExpense, expenseDate });
    assert.equal(result.success, false, `Expected ${expenseDate} to be rejected`);
  }
});

test("expense schema requires both supply states", () => {
  for (const field of ["sourceOfSupply", "destinationOfSupply"] as const) {
    const result = expenseSchema.safeParse({ ...validExpense, [field]: "" });
    assert.equal(result.success, false, `Expected ${field} to be required`);
  }
});

test("expense schema rejects zero, negative, and over-precision amounts", () => {
  for (const amount of ["0", "-1", "12.345", "1e3"]) {
    const result = expenseSchema.safeParse({ ...validExpense, amount });
    assert.equal(result.success, false, `Expected ${amount} to be rejected`);
  }
});

test("expense totals add tax to tax-exclusive amounts and round to paise", () => {
  assert.deepEqual(calculateExpenseTotals(125_050, 5, false), {
    baseAmountCents: 125_050,
    taxAmountCents: 6_253,
    totalAmountCents: 131_303,
  });
});

test("expense totals extract tax from tax-inclusive amounts", () => {
  assert.deepEqual(calculateExpenseTotals(125_050, 5, true), {
    baseAmountCents: 119_095,
    taxAmountCents: 5_955,
    totalAmountCents: 125_050,
  });
});

test("expense totals preserve the entered amount when no tax rate is selected", () => {
  assert.deepEqual(calculateExpenseTotals(125_050, null, false), {
    baseAmountCents: 125_050,
    taxAmountCents: 0,
    totalAmountCents: 125_050,
  });
});

test("expense total limit matches the database decimal capacity", () => {
  assert.equal(MAX_EXPENSE_TOTAL_CENTS, 999_999_999_999);
  assert.ok(calculateExpenseTotals(MAX_EXPENSE_TOTAL_CENTS, 28, false).totalAmountCents > MAX_EXPENSE_TOTAL_CENTS);
});

test("expense amounts convert to cents without floating-point rounding", () => {
  assert.equal(parseExpenseAmountCents("0.01"), 1);
  assert.equal(parseExpenseAmountCents("1250.50"), 125_050);
  assert.equal(parseExpenseAmountCents("1250"), 125_000);
});

test("expense amount conversion rejects malformed values", () => {
  assert.throws(() => parseExpenseAmountCents("1.005"), RangeError);
  assert.throws(() => parseExpenseAmountCents("1e3"), RangeError);
});
