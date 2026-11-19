import assert from "node:assert/strict";
import test from "node:test";

import { servicePackageSchema } from "../lib/schemas/service-package";

const validPackage = {
  serviceId: "service-1",
  name: "Consulting",
  description: "Professional consulting",
  isPopular: false,
  isActive: true,
  hasItems: false,
  features: [],
};

test("service package without line items gets one item from package details", () => {
  const parsed = servicePackageSchema.safeParse({
    ...validPackage,
    items: [],
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.items.length, 1);
  assert.equal(parsed.data.items[0].name, validPackage.name);
  assert.equal(parsed.data.items[0].description, validPackage.description);
  assert.equal(parsed.data.items[0].quantity, 1);
  assert.equal(parsed.data.items[0].unit, "Unit");
  assert.equal(parsed.data.items[0].unitPrice, 0);
  assert.equal(parsed.data.hasItems, false);
});

test("a single unnamed service package item inherits the package name and description", () => {
  const parsed = servicePackageSchema.safeParse({
    ...validPackage,
    items: [{
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 125,
      unitPriceUSD: 0,
      unit: "Hour",
      billingCycle: "MONTHLY",
      sortOrder: 0,
    }],
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.items[0].name, validPackage.name);
  assert.equal(parsed.data.items[0].description, validPackage.description);
  assert.equal(parsed.data.items[0].unitPrice, 125);
});

test("multiple service package items still require individual names", () => {
  const parsed = servicePackageSchema.safeParse({
    ...validPackage,
    hasItems: true,
    items: [
      {
        name: "",
        quantity: 1,
        unitPrice: 100,
        unitPriceUSD: 0,
        unit: "Hour",
        billingCycle: "MONTHLY",
        sortOrder: 0,
      },
      {
        name: "",
        quantity: 1,
        unitPrice: 25,
        unitPriceUSD: 0,
        unit: "Hour",
        billingCycle: "MONTHLY",
        sortOrder: 1,
      },
    ],
  });

  assert.equal(parsed.success, false);
});

test("itemized packages reject an unnamed single item", () => {
  const parsed = servicePackageSchema.safeParse({
    ...validPackage,
    hasItems: true,
    items: [{
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 125,
      unitPriceUSD: 0,
      unit: "Hour",
      billingCycle: "MONTHLY",
      sortOrder: 0,
    }],
  });

  assert.equal(parsed.success, false);
});

test("itemized packages require at least one item", () => {
  const parsed = servicePackageSchema.safeParse({
    ...validPackage,
    hasItems: true,
    items: [],
  });

  assert.equal(parsed.success, false);
});
