import { SubtitleChunk } from '@/types/editor';

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function toSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}

export function toVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSRT(subtitles: SubtitleChunk[]) {
  const lines = subtitles.map((chunk, i) => {
    const start = toSRTTime(chunk.startTime);
    const end = toSRTTime(chunk.endTime);
    return `${i + 1}\n${start} --> ${end}\n${chunk.text}`;
  });
  downloadTextFile(lines.join('\n\n'), 'subtitles.srt', 'text/plain');
}

export function exportVTT(subtitles: SubtitleChunk[]) {
  const lines = ['WEBVTT', '', ...subtitles.map((chunk, i) => {
    const start = toVTTTime(chunk.startTime);
    const end = toVTTTime(chunk.endTime);
    return `${i + 1}\n${start} --> ${end}\n${chunk.text}`;
  })];
  downloadTextFile(lines.join('\n\n'), 'subtitles.vtt', 'text/vtt');
}
