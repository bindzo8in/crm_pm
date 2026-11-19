import assert from "node:assert/strict";
import test from "node:test";

import { customLineItemCreateSchema } from "@/lib/schemas/proposal-pricing-schema";

test("custom goods line items accept an optional HSN code", () => {
  const parsed = customLineItemCreateSchema.safeParse({
    proposalId: "proposal-1",
    name: "Replacement part",
    quantity: 1,
    unitPrice: 100,
    itemType: "GOODS",
    sacCode: "",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.itemType, "GOODS");
  assert.equal(parsed.data.sacCode, "");
});
