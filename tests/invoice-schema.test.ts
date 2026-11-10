import assert from "node:assert/strict";
import test from "node:test";

import {
  createInvoiceSchema,
  invoiceFormSchema,
} from "@/lib/schemas/invoice-schema";

test("invoice creation does not require or retain an invoice title", () => {
  const parsed = createInvoiceSchema.safeParse({
    customerId: "customer-1",
    lineItems: [
      {
        name: "Consulting",
        quantity: 1,
        unitPrice: 100,
      },
    ],
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal("title" in parsed.data, false);
});

test("invoice form stores its issue date at midnight in the company timezone", () => {
  const parsed = invoiceFormSchema.safeParse({
    customerId: "customer-1",
    issueDate: "2026-11-10",
    lineItems: [
      {
        name: "Consulting",
        quantity: 1,
        unitPrice: 100,
      },
    ],
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.issueDate?.toISOString(), "2026-11-09T18:30:00.000Z");
});
