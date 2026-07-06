import { SubtitleChunk } from '@/types/editor';

export function hasWebGPU() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function makeAudioChunks(audio: Float32Array, sampleRate: number) {
  const chunkSeconds = 30;
  const overlapSeconds = 5;
  const chunkSize = chunkSeconds * sampleRate;
  const stepSize = (chunkSeconds - overlapSeconds) * sampleRate;
  const chunks: Array<{ audio: Float32Array; startTime: number; endTime: number }> = [];

  for (let start = 0; start < audio.length; start += stepSize) {
    const end = Math.min(audio.length, start + chunkSize);
    chunks.push({
      audio: audio.slice(start, end),
      startTime: start / sampleRate,
      endTime: end / sampleRate,
    });
    if (end >= audio.length) break;
  }
  return chunks;
}

export function normalizeWhisperOutput(
  output: any,
  chunkIndex: number,
  offset: number,
  chunkEnd: number
): SubtitleChunk[] {
  const rawChunks = Array.isArray(output?.chunks) ? output.chunks : [];
  if (!rawChunks.length && typeof output?.text === 'string' && output.text.trim()) {
    return [{
      id: `transcribed-${chunkIndex + 1}-1`,
      startTime: Number(offset.toFixed(2)),
      endTime: Number(chunkEnd.toFixed(2)),
      text: output.text.trim(),
    }];
  }

  return rawChunks
    .map((chunk: any, index: number) => {
      const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [0, null];
      const start = typeof timestamp[0] === 'number' ? timestamp[0] : 0;
      const end = typeof timestamp[1] === 'number' ? timestamp[1] : start + 4;
      return {
        id: `transcribed-${chunkIndex + 1}-${index + 1}`,
        startTime: Number((offset + start).toFixed(2)),
        endTime: Number(Math.min(offset + end, chunkEnd).toFixed(2)),
        text: String(chunk.text ?? '').trim(),
      };
    })
    .filter((chunk: SubtitleChunk) => chunk.text && chunk.endTime > chunk.startTime);
}

