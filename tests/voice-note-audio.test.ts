import assert from "node:assert/strict";
import test from "node:test";
import { createVoiceNoteWav } from "../lib/voice-note-audio";

test("voice note WAV encoding writes mono 16-bit PCM at 16 kHz", async () => {
  const blob = createVoiceNoteWav([new Float32Array([-1, -0.5, 0.5, 1])], 32_000);
  const view = new DataView(await blob.arrayBuffer());

  assert.equal(blob.type, "audio/wav");
  assert.equal(blob.size, 48);
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getInt16(44, true), -24_576);
  assert.equal(view.getInt16(46, true), 24_575);
});

test("voice note WAV encoding preserves samples split across processor chunks", async () => {
  const blob = createVoiceNoteWav([
    new Float32Array([0.25]),
    new Float32Array([0.75]),
  ], 16_000);
  const view = new DataView(await blob.arrayBuffer());

  assert.equal(view.getUint32(40, true), 4);
  assert.equal(view.getInt16(44, true), 8_191);
  assert.equal(view.getInt16(46, true), 24_575);
});

test("voice note WAV encoding rejects an invalid input sample rate", () => {
  assert.throws(
    () => createVoiceNoteWav([], 0),
    /sample rate is invalid/,
  );
});
