export interface VideoSegment {
  startTime: number;
  endTime: number;
}

export function sanitizeTrimRange(duration: number, trimStart: number, trimEnd: number) {
  const maxDuration = Math.max(0, duration);
  const safeStart = Math.max(0, Math.min(trimStart || 0, maxDuration));
  const safeEnd = Math.max(safeStart, Math.min(trimEnd || maxDuration, maxDuration));
  return {
    trimStart: safeStart,
    trimEnd: safeEnd,
  };
}

export function getTrimSegments(
  duration: number,
  trimStart: number,
  trimEnd: number,
): VideoSegment[] {
  const { trimStart: safeStart, trimEnd: safeEnd } = sanitizeTrimRange(duration, trimStart, trimEnd);
  if (safeEnd <= safeStart) return [];
  return [{ startTime: safeStart, endTime: safeEnd }];
}

export function getSegmentAtOrAfter(segments: VideoSegment[], time: number) {
  if (!segments.length) return null;
  const inSegment = segments.find((segment) => time >= segment.startTime && time <= segment.endTime);
  if (inSegment) return inSegment;

  const next = segments.find((segment) => segment.startTime > time);
  if (next) return next;

  return segments[segments.length - 1];
}

export function getSegmentIndex(segments: VideoSegment[], time: number): number {
  return segments.findIndex((segment) => time >= segment.startTime && time <= segment.endTime);
}

export function getTimelineDuration(segments: VideoSegment[]) {
  if (!segments.length) return 0;
  return segments.reduce((acc, segment) => acc + (segment.endTime - segment.startTime), 0);
}

export function mapSegmentTimeToLinear(segments: VideoSegment[], time: number) {
  if (!segments.length) return 0;
  let offset = 0;
  for (const segment of segments) {
    if (time <= segment.startTime) return offset;
    if (time >= segment.endTime) {
      offset += segment.endTime - segment.startTime;
      continue;
    }
    return offset + (time - segment.startTime);
  }
  return offset;
}

export function mapLinearToSegmentTime(segments: VideoSegment[], seconds: number) {
  if (!segments.length || !Number.isFinite(seconds)) return 0;
  let remaining = seconds;

  for (const segment of segments) {
    const len = segment.endTime - segment.startTime;
    if (remaining <= len) return segment.startTime + remaining;
    remaining -= len;
  }

  return segments[segments.length - 1]?.endTime ?? 0;
}
