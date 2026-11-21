import assert from "node:assert/strict";
import test from "node:test";
import { parseExpenseReceiptUrl } from "../lib/expense-receipt";

test("accepts PDF receipts stored as raw Cloudinary assets", () => {
  const receipt = parseExpenseReceiptUrl(
    "https://res.cloudinary.com/example-cloud/raw/upload/v123/finance/receipt.pdf",
  );

  assert.equal(receipt?.extension, "pdf");
  assert.equal(receipt?.contentType, "application/pdf");
});

test("accepts supported image receipts stored as Cloudinary images", () => {
  const receipt = parseExpenseReceiptUrl(
    "https://res.cloudinary.com/example-cloud/image/upload/v123/finance/receipt.webp",
  );

  assert.equal(receipt?.contentType, "image/webp");
});

test("rejects URLs outside Cloudinary and unsupported resource types", () => {
  const invalidUrls = [
    "https://example.com/receipt.pdf",
    "https://res.cloudinary.com/example-cloud/raw/upload/v123/receipt.exe",
    "http://res.cloudinary.com/example-cloud/raw/upload/v123/receipt.pdf",
    "https://res.cloudinary.com/example-cloud/video/upload/v123/receipt.pdf",
  ];

  for (const url of invalidUrls) {
    assert.equal(parseExpenseReceiptUrl(url), null, url);
  }
});

test("treats extensionless raw expense uploads as PDFs", () => {
  const receipt = parseExpenseReceiptUrl(
    "https://res.cloudinary.com/legacy-cloud/raw/upload/v123/finance/receipt",
  );

  assert.equal(receipt?.extension, "pdf");
  assert.equal(receipt?.contentType, "application/pdf");
});

test("accepts attachments from Cloudinary accounts used before tenant consolidation", () => {
  const receipt = parseExpenseReceiptUrl(
    "https://res.cloudinary.com/legacy-cloud/raw/upload/v123/finance/receipt.pdf",
  );

  assert.equal(receipt?.contentType, "application/pdf");
});
