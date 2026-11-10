import assert from "node:assert/strict";
import test from "node:test";
import { createAttachmentContentDisposition } from "../lib/chat-attachment";

test("attachment download names include the original Unicode filename", () => {
  assert.equal(
    createAttachmentContentDisposition("Invoice October.pdf"),
    "attachment; filename=\"Invoice October.pdf\"; filename*=UTF-8''Invoice%20October.pdf",
  );
});

test("attachment download names cannot inject response headers or path components", () => {
  const disposition = createAttachmentContentDisposition("../../invoice\r\nX-Injected: yes.pdf");

  assert.equal(disposition, "attachment; filename=\".._.._invoice__X-Injected: yes.pdf\"; filename*=UTF-8''.._.._invoice__X-Injected%3A%20yes.pdf");
});
