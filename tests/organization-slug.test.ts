import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ORGANIZATION_SLUG_LENGTH,
  organizationSlugFromName,
  organizationSlugSchema,
} from "../lib/organization-slug";

test("organization slug suggestions are generated from names", () => {
  assert.equal(organizationSlugFromName("Acme Studio!"), "acme-studio");
  assert.equal(organizationSlugFromName("🔥"), "organization");
});

test("organization slug suggestions stay within the address limit", () => {
  const slug = organizationSlugFromName("Acme ".repeat(20));

  assert.equal(slug.length <= MAX_ORGANIZATION_SLUG_LENGTH, true);
  assert.equal(slug.endsWith("-"), false);
  assert.equal(organizationSlugSchema.safeParse(slug).success, true);
});
