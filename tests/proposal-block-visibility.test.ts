import assert from "node:assert/strict";
import test from "node:test";

import { isProposalBlockVisible } from "../lib/proposal-block-visibility";

test("timeline blocks are visible only when explicitly enabled", () => {
  assert.equal(isProposalBlockVisible({ type: "TIMELINE" }), false);
  assert.equal(isProposalBlockVisible({ type: "TIMELINE", isVisible: false }), false);
  assert.equal(isProposalBlockVisible({ type: "TIMELINE", isVisible: true }), true);
});

test("other blocks preserve the existing visibility default", () => {
  assert.equal(isProposalBlockVisible({ type: "CUSTOM" }), true);
  assert.equal(isProposalBlockVisible({ type: "CUSTOM", isVisible: false }), false);
});
