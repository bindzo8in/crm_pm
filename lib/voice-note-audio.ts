const VOICE_NOTE_SAMPLE_RATE = 16_000;

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function createVoiceNoteWav(
  chunks: readonly Float32Array[],
  inputSampleRate: number,
) {
  if (!Number.isFinite(inputSampleRate) || inputSampleRate <= 0) {
    throw new Error("The microphone audio sample rate is invalid.");
  }

  const totalInputSamples = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const outputSampleRate = Math.min(VOICE_NOTE_SAMPLE_RATE, inputSampleRate);
  const samplesPerOutputSample = inputSampleRate / outputSampleRate;
  const outputSampleCount = Math.floor(totalInputSamples / samplesPerOutputSample);
  const dataSize = outputSampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, outputSampleRate, true);
  view.setUint32(28, outputSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let chunkIndex = 0;
  let chunkOffset = 0;
  let inputSampleIndex = 0;
  for (let outputIndex = 0; outputIndex < outputSampleCount; outputIndex += 1) {
    const endInputIndex = Math.min(
      totalInputSamples,
      Math.floor((outputIndex + 1) * samplesPerOutputSample),
    );
    let sum = 0;
    let count = 0;

    while (inputSampleIndex < endInputIndex) {
      while (chunkIndex < chunks.length && chunkOffset >= chunks[chunkIndex].length) {
        chunkIndex += 1;
        chunkOffset = 0;
      }

      const chunk = chunks[chunkIndex];
      if (!chunk) break;
      sum += chunk[chunkOffset];
      chunkOffset += 1;
      inputSampleIndex += 1;
      count += 1;
    }

    const sample = Math.max(-1, Math.min(1, count ? sum / count : 0));
    const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(44 + outputIndex * 2, pcmSample, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}
