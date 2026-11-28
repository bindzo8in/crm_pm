import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhoneNumber } from "../lib/phone-number";

test("normalizes an Indian national phone number to E.164", () => {
  assert.deepEqual(normalizePhoneNumber("9884344503", "IN"), {
    value: "+919884344503",
    parseFailed: false,
  });
});

test("normalizes a formatted international phone number", () => {
  assert.deepEqual(normalizePhoneNumber("+91 9884344503", "IN"), {
    value: "+919884344503",
    parseFailed: false,
  });
});

test("reports an unparseable saved phone value", () => {
  assert.deepEqual(normalizePhoneNumber("not a phone number", "IN"), {
    value: "",
    parseFailed: true,
  });
});
