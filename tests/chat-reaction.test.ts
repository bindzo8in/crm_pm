import assert from "node:assert/strict";
import test from "node:test";
import { getNextChatReaction } from "../lib/chat-reaction";

test("choosing a different emoji replaces the current reaction", () => {
  assert.equal(getNextChatReaction("👍", "❤️"), "❤️");
});

test("choosing the current emoji removes the reaction", () => {
  assert.equal(getNextChatReaction("👍", "👍"), null);
});

test("choosing an emoji on a message without a reaction adds it", () => {
  assert.equal(getNextChatReaction(null, "😂"), "😂");
});
