import { SubtitleChunk } from '@/types/editor';

export function buildSRT(subtitles: SubtitleChunk[]): string {
  return subtitles
    .map(
      (chunk, index) =>
        `${index + 1}\n${toSRTTime(chunk.startTime)} --> ${toSRTTime(chunk.endTime)}\n${chunk.text}`,
    )
    .join('\n\n');
}

export function buildVTT(subtitles: SubtitleChunk[]): string {
  return ['WEBVTT', '', ...subtitles.map((chunk, index) =>
    `${index + 1}\n${toVTTTime(chunk.startTime)} --> ${toVTTTime(chunk.endTime)}\n${chunk.text}`,
  )].join('\n\n');
}

export function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function pad(value: number): string {
  return String(Math.floor(value)).padStart(2, '0');
}

function toSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}

function toVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}
