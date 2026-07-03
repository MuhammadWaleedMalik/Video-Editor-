import { SubtitleChunk } from '@/types/editor';

function timeToSeconds(time: string): number {
  // Handles HH:MM:SS,mmm or HH:MM:SS.mmm or MM:SS.mmm
  const cleaned = time.replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(parts[0]);
}

export function parseSRT(content: string): SubtitleChunk[] {
  const chunks: SubtitleChunk[] = [];
  const blocks = content.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const textLines = lines.slice(lines.indexOf(timeLine) + 1);

    chunks.push({
      id: crypto.randomUUID(),
      startTime: timeToSeconds(startStr),
      endTime: timeToSeconds(endStr),
      text: textLines.join(' ').trim(),
    });
  }

  return chunks;
}

export function parseVTT(content: string): SubtitleChunk[] {
  const withoutHeader = content.replace(/^WEBVTT[^\n]*\n/, '');
  return parseSRT(withoutHeader);
}

export function parseJSON(content: string): SubtitleChunk[] {
  try {
    const data = JSON.parse(content);
    const arr = Array.isArray(data) ? data : data.subtitles ?? data.chunks ?? [];

    return arr.map((item: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      startTime:
        typeof item.startTime === 'number'
          ? item.startTime
          : typeof item.start === 'number'
          ? item.start
          : timeToSeconds(String(item.startTime ?? item.start ?? '0')),
      endTime:
        typeof item.endTime === 'number'
          ? item.endTime
          : typeof item.end === 'number'
          ? item.end
          : timeToSeconds(String(item.endTime ?? item.end ?? '0')),
      text: String(item.text ?? item.content ?? ''),
    }));
  } catch {
    return [];
  }
}

export function parseSubtitleFile(file: File): Promise<SubtitleChunk[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'srt') resolve(parseSRT(content));
      else if (ext === 'vtt') resolve(parseVTT(content));
      else if (ext === 'json') resolve(parseJSON(content));
      else resolve([]);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
