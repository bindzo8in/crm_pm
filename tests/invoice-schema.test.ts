import assert from "node:assert/strict";
import test from "node:test";

import { createInvoiceSchema } from "@/lib/schemas/invoice-schema";

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
