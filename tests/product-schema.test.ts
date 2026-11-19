import assert from "node:assert/strict";
import test from "node:test";

import { productSchema } from "../lib/schemas/product-schema";

const validProduct = {
  name: "Printed brochure",
  basePrice: "125.50",
  basePriceUSD: "1.5",
  taxRate: "18",
};

test("product schema coerces prices and applies catalog defaults", () => {
  const parsed = productSchema.safeParse(validProduct);

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.basePrice, 125.5);
  assert.equal(parsed.data.basePriceUSD, 1.5);
  assert.equal(parsed.data.unit, "item");
  assert.equal(parsed.data.isActive, true);
});

test("product schema rejects negative prices and invalid tax rates", () => {
  assert.equal(
    productSchema.safeParse({ ...validProduct, basePrice: "-1" }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({ ...validProduct, taxRate: "101" }).success,
    false,
  );
});
