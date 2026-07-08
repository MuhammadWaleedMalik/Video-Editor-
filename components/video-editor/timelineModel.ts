import { CanvasObject, Layer, MediaAsset, TimelineClip } from '@/types/editor';

export const MIN_CLIP_DURATION = 3;
export const MIN_IMAGE_CLIP_DURATION = 1;
export const MAX_TIMELINE_DURATION_SECONDS = 180;
const EPSILON = 0.000001;

function finiteSourceEnd(clip: TimelineClip): number {
  return Number.isFinite(clip.sourceEnd) ? clip.sourceEnd : clip.sourceStart + Math.max(0, clip.duration);
}

export function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function clampProjectDuration(duration: number): number {
  if (!Number.isFinite(duration)) return 0;
  return Math.max(0, Math.min(MAX_TIMELINE_DURATION_SECONDS, duration));
}

export function calculateTimelineDuration(clips: Pick<TimelineClip, 'timelineStart' | 'duration'>[]): number {
  if (!clips.length) return 0;
  const maxEnd = clips.reduce((currentMaxEnd, clip) => {
    const start = Number.isFinite(clip.timelineStart) ? Math.max(0, clip.timelineStart) : 0;
    const duration = Number.isFinite(clip.duration) ? Math.max(0, clip.duration) : 0;
    return Math.max(currentMaxEnd, start + duration);
  }, 0);
  return clampProjectDuration(maxEnd);
}

export function calculateLayerTimelineDuration(
  layers: Array<Pick<{ startTime: number; endTime: number }, 'startTime' | 'endTime'>>
): number {
  if (!layers.length) return 0;
  const maxEnd = layers.reduce((currentMaxEnd, layer) => {
    const start = Number.isFinite(layer.startTime) ? Math.max(0, layer.startTime) : 0;
    const end = Number.isFinite(layer.endTime) ? Math.max(start, layer.endTime) : start;
    return Math.max(currentMaxEnd, end);
  }, 0);
  return clampProjectDuration(maxEnd);
}

export function clampPlayhead(time: number, duration: number): number {
  const safeDuration = clampProjectDuration(duration);
  if (safeDuration === 0) return 0;
  return Math.max(0, Math.min(Number.isFinite(time) ? time : 0, safeDuration));
}

export function clampTimelineStartForDuration(timelineStart: number, duration: number): number {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const maxStart = Math.max(0, MAX_TIMELINE_DURATION_SECONDS - Math.min(safeDuration, MAX_TIMELINE_DURATION_SECONDS));
  return Math.max(0, Math.min(Number.isFinite(timelineStart) ? timelineStart : 0, maxStart));
}

export function fitClipToTimeline(clip: TimelineClip): TimelineClip {
  const safeDuration = Number.isFinite(clip.duration) ? Math.max(0, clip.duration) : 0;
  const timelineStart = Math.max(
    0,
    Math.min(Number.isFinite(clip.timelineStart) ? clip.timelineStart : 0, MAX_TIMELINE_DURATION_SECONDS)
  );
  const maxDuration = Math.max(0, MAX_TIMELINE_DURATION_SECONDS - timelineStart);
  const duration = Math.min(safeDuration, maxDuration);
  const sourceStart = Number.isFinite(clip.sourceStart) ? Math.max(0, clip.sourceStart) : 0;
  return {
    ...clip,
    timelineStart,
    sourceStart,
    sourceEnd: sourceStart + duration,
    duration,
  };
}

export function clampLayerTiming<T extends Pick<Layer, 'startTime' | 'endTime'>>(layer: T): T {
  const startTime = Math.max(
    0,
    Math.min(Number.isFinite(layer.startTime) ? layer.startTime : 0, MAX_TIMELINE_DURATION_SECONDS)
  );
  const endTime = Math.max(
    startTime,
    Math.min(Number.isFinite(layer.endTime) ? layer.endTime : startTime, MAX_TIMELINE_DURATION_SECONDS)
  );
  return { ...layer, startTime, endTime };
}

export function isClipActive(clip: TimelineClip, currentTime: number): boolean {
  if (clip.hidden || !Number.isFinite(currentTime)) return false;
  const start = Math.max(0, clip.timelineStart);
  const end = start + Math.max(0, clip.duration);
  return currentTime + EPSILON >= start && currentTime < end - EPSILON;
}

export function sourceTimeForClip(clip: TimelineClip, currentTime: number): number {
  return clip.sourceStart + Math.max(0, currentTime - clip.timelineStart);
}

export function shouldRenderAsset(asset?: MediaAsset): asset is MediaAsset {
  return Boolean(asset && asset.type !== 'audio' && asset.status === 'deployed' && asset.metadataLoaded);
}

export function getRenderableClips(
  clips: TimelineClip[],
  assets: MediaAsset[],
  currentTime: number
): TimelineClip[] {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  return clips.filter((clip) => isClipActive(clip, currentTime) && shouldRenderAsset(assetById.get(clip.assetId)));
}

export type TimelineStackItem =
  | { kind: 'clip'; id: string; order: number; clip: TimelineClip; object: CanvasObject }
  | { kind: 'layer'; id: string; order: number; layer: Layer };

export function getTimelineStackItems(
  layers: Layer[],
  clips: TimelineClip[],
  canvasObjects: CanvasObject[]
): TimelineStackItem[] {
  const objectById = new Map(canvasObjects.map((object) => [object.id, object]));
  const clipItems = clips
    .map((clip): TimelineStackItem | null => {
      const object = objectById.get(clip.canvasObjectId);
      return object ? { kind: 'clip', id: clip.id, order: object.drawOrder, clip, object } : null;
    })
    .filter((item): item is TimelineStackItem => Boolean(item));
  const layerItems = layers
    .map((layer): TimelineStackItem => ({ kind: 'layer', id: layer.id, order: layer.zIndex, layer }));

  return [...clipItems, ...layerItems].sort((a, b) => {
    if (b.order !== a.order) return b.order - a.order;
    if (a.kind !== b.kind) return a.kind === 'layer' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export function reorderTimelineStack(
  kind: TimelineStackItem['kind'],
  id: string,
  targetIndex: number,
  layers: Layer[],
  clips: TimelineClip[],
  canvasObjects: CanvasObject[]
): { layers: Layer[]; canvasObjects: CanvasObject[] } | null {
  const stackItems = getTimelineStackItems(layers, clips, canvasObjects);
  const currentIndex = stackItems.findIndex((item) => item.kind === kind && item.id === id);
  if (currentIndex === -1) return null;

  const nextIndex = Math.max(0, Math.min(stackItems.length - 1, targetIndex));
  if (nextIndex === currentIndex) return null;

  const reordered = [...stackItems];
  const [moved] = reordered.splice(currentIndex, 1);
  reordered.splice(nextIndex, 0, moved);

  const maxOrder = reordered.length;
  const orderByKey = new Map(
    reordered.map((item, index) => [`${item.kind}:${item.id}`, maxOrder - index] as const)
  );
  const clipIdsByObjectId = clips.reduce((map, clip) => {
    const existing = map.get(clip.canvasObjectId) ?? [];
    existing.push(clip.id);
    map.set(clip.canvasObjectId, existing);
    return map;
  }, new Map<string, string[]>());

  return {
    layers: layers.map((layer) => {
      const nextOrder = orderByKey.get(`layer:${layer.id}`);
      return nextOrder ? { ...layer, zIndex: nextOrder } : layer;
    }),
    canvasObjects: canvasObjects.map((object) => {
      const clipIds = clipIdsByObjectId.get(object.id);
      if (!clipIds?.length) return object;
      const nextOrder = Math.max(...clipIds.map((clipId) => orderByKey.get(`clip:${clipId}`) ?? 0));
      return nextOrder ? { ...object, drawOrder: nextOrder } : object;
    }),
  };
}

export function trimClipEnd(clip: TimelineClip, nextSourceEnd: number, maxSourceEnd = clip.sourceEnd): TimelineClip {
  const boundedSourceEnd = finiteSourceEnd(clip);
  const hardMax = Number.isFinite(maxSourceEnd) ? maxSourceEnd : boundedSourceEnd;
  const safeMaxEnd = Math.max(clip.sourceStart, hardMax);
  const minSourceEnd = Math.min(safeMaxEnd, clip.sourceStart + MIN_CLIP_DURATION);
  const sourceEnd = Math.max(minSourceEnd, Math.min(safeMaxEnd, nextSourceEnd));
  return {
    ...clip,
    sourceEnd,
    duration: Math.max(0, sourceEnd - clip.sourceStart),
  };
}

export function trimClipStart(clip: TimelineClip, nextSourceStart: number): TimelineClip {
  const sourceEnd = finiteSourceEnd(clip);
  const sourceStart = Math.max(0, Math.min(nextSourceStart, sourceEnd - MIN_CLIP_DURATION));
  const duration = Math.max(0, sourceEnd - sourceStart);
  const oldEnd = clip.timelineStart + Math.max(0, clip.duration);
  return {
    ...clip,
    sourceStart,
    duration,
    timelineStart: Math.max(0, oldEnd - duration),
  };
}

export function moveClip(clip: TimelineClip, timelineStart: number): TimelineClip {
  return {
    ...clip,
    timelineStart: Math.max(0, Number.isFinite(timelineStart) ? timelineStart : 0),
  };
}

export function resizeImageClipEnd(clip: TimelineClip, nextSourceEnd: number): TimelineClip {
  const sourceStart = Number.isFinite(clip.sourceStart) ? Math.max(0, clip.sourceStart) : 0;
  const fallbackEnd = sourceStart + Math.max(MIN_IMAGE_CLIP_DURATION, clip.duration || MIN_IMAGE_CLIP_DURATION);
  const sourceEnd = Math.max(
    sourceStart + MIN_IMAGE_CLIP_DURATION,
    Number.isFinite(nextSourceEnd) ? nextSourceEnd : fallbackEnd
  );
  return {
    ...clip,
    sourceStart,
    sourceEnd,
    duration: sourceEnd - sourceStart,
  };
}

export function canSplitClip(clip: TimelineClip): boolean {
  const duration = Number.isFinite(clip.duration) ? Math.max(0, clip.duration) : 0;
  return clip.type === 'video' && duration >= MIN_CLIP_DURATION * 2;
}

export function splitClipAtMidpoint(
  clip: TimelineClip,
  secondClipId: string,
  secondCanvasObjectId: string
): [TimelineClip, TimelineClip] | null {
  if (!canSplitClip(clip)) return null;

  const sourceStart = Number.isFinite(clip.sourceStart) ? Math.max(0, clip.sourceStart) : 0;
  const safeSourceEnd = finiteSourceEnd(clip);
  const safeDuration = Math.min(Math.max(0, clip.duration), Math.max(0, safeSourceEnd - sourceStart));
  if (safeDuration < MIN_CLIP_DURATION * 2) return null;

  const firstDuration = safeDuration / 2;
  const secondDuration = safeDuration - firstDuration;
  const splitSourceTime = sourceStart + firstDuration;
  const timelineStart = Number.isFinite(clip.timelineStart) ? Math.max(0, clip.timelineStart) : 0;

  return [
    {
      ...clip,
      sourceStart,
      sourceEnd: splitSourceTime,
      duration: firstDuration,
      timelineStart,
      selected: false,
    },
    {
      ...clip,
      id: secondClipId,
      canvasObjectId: secondCanvasObjectId,
      sourceStart: splitSourceTime,
      sourceEnd: splitSourceTime + secondDuration,
      duration: secondDuration,
      timelineStart: timelineStart + firstDuration,
      selected: true,
    },
  ];
}
