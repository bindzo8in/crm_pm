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

test("invoice line items cannot link both a product and a service package", () => {
  const parsed = createInvoiceSchema.safeParse({
    customerId: "customer-1",
    lineItems: [
      {
        productId: "product-1",
        servicePackageId: "package-1",
        name: "Consulting",
        quantity: 1,
        unitPrice: 100,
      },
    ],
  });

  assert.equal(parsed.success, false);
});

test("goods line items accept an optional HSN code", () => {
  const parsed = createInvoiceSchema.safeParse({
    customerId: "customer-1",
    lineItems: [
      {
        name: "Replacement part",
        quantity: 1,
        unitPrice: 100,
        itemType: "GOODS",
        sacCode: "",
      },
    ],
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.lineItems[0]?.itemType, "GOODS");
  assert.equal(parsed.data.lineItems[0]?.sacCode, "");
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
