/* eslint-disable @next/next/no-img-element */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AudioLines, GripVertical, Scissors, Settings2, Trash2, Volume2, VolumeX } from 'lucide-react';
import { CanvasObject, Layer, MediaAsset, TimelineClip } from '@/types/editor';
import { getTimelineStackItems, MIN_CLIP_DURATION } from './timelineModel';
import { formatTick, getTimelineMinorTickStep, getTimelineTickStep, getTimelineTicks } from './timelineUtils';
import TrackRow from './TrackRow';
import Playhead from './Playhead';
import TimelineTickStrip from './TimelineTickStrip';

interface TimelineRowsProps {
  dur: number;
  currentTime: number;
  layers: Layer[];
  mediaAssets: MediaAsset[];
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedClipId: string | null;
  selectedLayerId: string | null;
  timelineWidth: number;
  timelineLaneRef: React.RefObject<HTMLDivElement>;
  timeToPercent: (time: number) => string;
  onPlayheadPointerDown: (e: React.PointerEvent) => void;
  onTimelinePointerDown: (e: React.PointerEvent) => void;
  onLayerPointerDown: (
    e: React.PointerEvent,
    layer: Layer,
    mode: 'move' | 'start' | 'end' | 'z'
  ) => void;
  onClipPointerDown: (
    e: React.PointerEvent,
    clip: TimelineClip,
    mode: 'move' | 'start' | 'end' | 'z'
  ) => void;
  onSelectClip: (id: string | null) => void;
  onSelectLayer: (id: string | null) => void;
  onSplitClip: (id: string) => void;
  onToggleClipMute: (id: string) => void;
  onDeleteClip: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onSplitLayer: (id: string) => void;
  onToggleLayerMute: (id: string) => void;
  onOpenItemEditor?: () => void;
  stackDragPreview: {
    kind: 'clip' | 'layer';
    id: string;
    targetIndex: number;
    clientX: number;
    clientY: number;
  } | null;
}

interface ClipPreviewProps {
  asset?: MediaAsset;
  clip: TimelineClip;
  timelinePixelWidth: number;
}

const IMAGE_TILE_INDICES = Array.from({ length: 8 }, (_, index) => index);
const TIMELINE_FRAME_WIDTH = 120;
const TIMELINE_FRAME_HEIGHT = 68;
const TIMELINE_FRAME_TARGET_SPACING = 86;
const TIMELINE_FRAME_BUILD_DELAY_MS = 120;
const MAX_TIMELINE_FRAME_CACHE_SIZE = 64;
const MAX_TIMELINE_FRAMES_PER_CLIP = 48;
const TIMELINE_LABEL_MIN_WIDTH = 72;
const READABLE_TICK_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 20, 30, 60, 120, 180, 300, 600];
const timelineFrameCache = new Map<string, string[]>();
const timelineFrameRequests = new Map<string, Promise<string[]>>();

function getTimelineLayerRowKey(layer: Layer) {
  return layer.type === 'audio' ? `audio-group:${layer.timelineGroupId ?? layer.id}` : `layer:${layer.id}`;
}

function getTimelineClipRowKey(clip: TimelineClip) {
  return `clip-group:${clip.timelineGroupId ?? clip.canvasObjectId}`;
}

function getReadableTimelineTickStep(duration: number, timelineWidth: number) {
  const maxLabels = Math.max(2, Math.floor(timelineWidth / TIMELINE_LABEL_MIN_WIDTH));
  const rawStep = Math.max(0.1, duration / maxLabels);
  return READABLE_TICK_STEPS.find((step) => step >= rawStep) ?? getTimelineTickStep(duration);
}

function getFrameCacheKey(asset: MediaAsset, clip: TimelineClip, frameCount: number) {
  return `${getFrameIdentityKey(asset, clip)}|${frameCount}`;
}

function getFrameIdentityKey(asset: MediaAsset, clip: TimelineClip) {
  return [
    asset.id,
    asset.url,
    clip.sourceStart.toFixed(3),
    clip.duration.toFixed(3),
    clip.sourceEnd.toFixed(3),
  ].join('|');
}

function rememberTimelineFrames(key: string, frames: string[]) {
  if (timelineFrameCache.has(key)) timelineFrameCache.delete(key);
  timelineFrameCache.set(key, frames);
  while (timelineFrameCache.size > MAX_TIMELINE_FRAME_CACHE_SIZE) {
    const oldest = timelineFrameCache.keys().next().value;
    if (!oldest) break;
    timelineFrameCache.delete(oldest);
  }
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: keyof HTMLVideoElementEventMap) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener('error', onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video preview failed.'));
    };
    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

async function buildTimelineFrames(asset: MediaAsset, clip: TimelineClip, frameCount: number) {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = asset.url;

  try {
    await waitForVideoEvent(video, 'loadedmetadata');
    const canvas = document.createElement('canvas');
    canvas.width = TIMELINE_FRAME_WIDTH;
    canvas.height = TIMELINE_FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const frames: string[] = [];
    const usableFrames = Math.max(1, frameCount);
    for (let i = 0; i < usableFrames; i += 1) {
      const progress = usableFrames === 1 ? 0 : i / (usableFrames - 1);
      const sourceTime = clip.sourceStart + progress * Math.max(0, clip.duration - 0.04);
      video.currentTime = Math.max(0, Math.min(sourceTime, asset.duration ?? sourceTime));
      await waitForVideoEvent(video, 'seeked');

      ctx.fillStyle = '#050301';
      ctx.fillRect(0, 0, TIMELINE_FRAME_WIDTH, TIMELINE_FRAME_HEIGHT);
      const vw = video.videoWidth || TIMELINE_FRAME_WIDTH;
      const vh = video.videoHeight || TIMELINE_FRAME_HEIGHT;
      const scale = Math.max(TIMELINE_FRAME_WIDTH / vw, TIMELINE_FRAME_HEIGHT / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(video, (TIMELINE_FRAME_WIDTH - dw) / 2, (TIMELINE_FRAME_HEIGHT - dh) / 2, dw, dh);
      frames.push(canvas.toDataURL('image/jpeg', 0.72));
    }
    return frames;
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}

function requestTimelineFrames(asset: MediaAsset, clip: TimelineClip, frameCount: number) {
  const key = getFrameCacheKey(asset, clip, frameCount);
  const cached = timelineFrameCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = timelineFrameRequests.get(key);
  if (pending) return pending;

  const request = buildTimelineFrames(asset, clip, frameCount)
    .then((frames) => {
      rememberTimelineFrames(key, frames);
      return frames;
    })
    .finally(() => {
      timelineFrameRequests.delete(key);
    });
  timelineFrameRequests.set(key, request);
  return request;
}

const TimelineLayerPreview = memo(function TimelineLayerPreview({ layer }: { layer: Layer }) {
  if (layer.type === 'text') {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden px-3 text-center"
        style={{ backgroundColor: layer.bgColor === '#00000000' ? 'rgba(0,0,0,0.22)' : layer.bgColor || 'rgba(0,0,0,0.22)' }}
      >
        <span
          className="line-clamp-2 break-words font-semibold leading-tight"
          style={{
            color: layer.color || '#ffffff',
            fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: `${Math.max(10, Math.min(18, Math.round((layer.fontSize || 20) * 0.65)))}px`,
          }}
        >
          {layer.text?.trim() || 'Text'}
        </span>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center gap-2 px-3 text-[#d8e7a5]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-black/35">
        <AudioLines size={14} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold">{layer.name}</div>
        <div className="truncate text-[9px] text-[#9cad6e]">{layer.src ? 'Audio linked' : 'Audio item'}</div>
      </div>
    </div>
  );
});

const TimelineClipPreview = memo(function TimelineClipPreview({ asset, clip, timelinePixelWidth }: ClipPreviewProps) {
  const [frameState, setFrameState] = useState({ identityKey: '', cacheKey: '', frames: [] as string[] });
  const frameCount = useMemo(() => {
    const byDuration = Math.ceil(Math.max(clip.duration, 1) / 1.5);
    const byWidth = Math.ceil(Math.max(timelinePixelWidth, TIMELINE_FRAME_TARGET_SPACING) / TIMELINE_FRAME_TARGET_SPACING);
    return Math.max(4, Math.min(MAX_TIMELINE_FRAMES_PER_CLIP, Math.max(byDuration, byWidth)));
  }, [clip.duration, timelinePixelWidth]);
  const frameIdentityKey = asset && asset.status === 'deployed'
    ? getFrameIdentityKey(asset, clip)
    : '';
  const frameCacheKey = asset && asset.type === 'video' && asset.status === 'deployed'
    ? getFrameCacheKey(asset, clip, frameCount)
    : '';
  const frames = frameState.identityKey === frameIdentityKey ? frameState.frames : [];

  useEffect(() => {
    let cancelled = false;
    if (!asset || asset.status !== 'deployed') {
      setFrameState({ identityKey: '', cacheKey: '', frames: [] });
      return;
    }
    if (asset.type === 'image') {
      setFrameState((previous) => (
        previous.identityKey === frameIdentityKey && previous.frames.length === 1 && previous.frames[0] === asset.url
          ? previous
          : { identityKey: frameIdentityKey, cacheKey: frameIdentityKey, frames: [asset.url] }
      ));
      return;
    }

    const cached = timelineFrameCache.get(frameCacheKey);
    if (cached) {
      setFrameState({ identityKey: frameIdentityKey, cacheKey: frameCacheKey, frames: cached });
      return;
    }

    setFrameState((previous) => (
      previous.identityKey === frameIdentityKey
        ? previous
        : { identityKey: frameIdentityKey, cacheKey: '', frames: [] }
    ));
    const timeout = window.setTimeout(() => {
      requestTimelineFrames(asset, clip, frameCount)
        .then((nextFrames) => {
          if (!cancelled) setFrameState({ identityKey: frameIdentityKey, cacheKey: frameCacheKey, frames: nextFrames });
        })
        .catch(() => {
          if (!cancelled) {
            setFrameState((previous) => (
              previous.identityKey === frameIdentityKey
                ? { identityKey: frameIdentityKey, cacheKey: '', frames: [] }
                : previous
            ));
          }
        });
    }, TIMELINE_FRAME_BUILD_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [asset, clip, frameCacheKey, frameCount, frameIdentityKey]);

  if (!asset) {
    return <div className="absolute inset-0 bg-[#241508]" />;
  }

  if (asset.type === 'image') {
    return (
      <div className="absolute inset-0 flex">
        {IMAGE_TILE_INDICES.map((index) => (
          <img key={index} src={asset.url} alt="" className="h-full min-w-[72px] flex-1 object-cover opacity-80" />
        ))}
      </div>
    );
  }

  if (!frames.length) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#090603] text-[10px] text-[#7a6040]">
        Loading frames
      </div>
    );
  }

  return (
    <div key={frameState.cacheKey} className="absolute inset-0 flex animate-in fade-in duration-150">
      {frames.map((frame, index) => (
        <img key={`${frameState.cacheKey}-${index}`} src={frame} alt="" className="h-full min-w-[58px] flex-1 object-cover opacity-85" />
      ))}
    </div>
  );
});

export default function TimelineRows({
  dur,
  currentTime,
  layers,
  mediaAssets,
  timelineClips,
  canvasObjects,
  selectedClipId,
  selectedLayerId,
  timelineWidth,
  timelineLaneRef,
  timeToPercent,
  onPlayheadPointerDown,
  onTimelinePointerDown,
  onLayerPointerDown,
  onClipPointerDown,
  onSelectClip,
  onSelectLayer,
  onSplitClip,
  onToggleClipMute,
  onDeleteClip,
  onDeleteLayer,
  onSplitLayer,
  onToggleLayerMute,
  onOpenItemEditor,
  stackDragPreview,
}: TimelineRowsProps) {
  const [clipToolbarAnchor, setClipToolbarAnchor] = useState<{ clipId: string; time: number } | null>(null);
  const [layerToolbarAnchor, setLayerToolbarAnchor] = useState<{ layerId: string; time: number } | null>(null);
  const assetById = useMemo(() => new Map(mediaAssets.map((asset) => [asset.id, asset])), [mediaAssets]);
  const stackItems = useMemo(
    () => getTimelineStackItems(layers, timelineClips, canvasObjects),
    [canvasObjects, layers, timelineClips]
  );
  const stackRows = useMemo(() => {
    const rows: Array<{ key: string; itemKeys: string[] }> = [];
    const rowIndexByKey = new Map<string, number>();

    stackItems.forEach((item) => {
      const rowKey = item.kind === 'clip' ? getTimelineClipRowKey(item.clip) : getTimelineLayerRowKey(item.layer);
      const itemKey = item.kind === 'clip' ? `clip:${item.id}` : `layer:${item.id}`;
      const existingIndex = rowIndexByKey.get(rowKey);
      if (existingIndex !== undefined) {
        rows[existingIndex].itemKeys.push(itemKey);
        return;
      }

      rowIndexByKey.set(rowKey, rows.length);
      rows.push({ key: rowKey, itemKeys: [itemKey] });
    });

    return rows;
  }, [stackItems]);
  const rowIndexByItemKey = useMemo(() => {
    const indexMap = new Map<string, number>();
    stackRows.forEach((row, index) => {
      row.itemKeys.forEach((itemKey) => indexMap.set(itemKey, index));
    });
    return indexMap;
  }, [stackRows]);
  const rowGap = 156;
  const rowTopOffset = 54;
  const rowCount = Math.max(stackRows.length, 1);
  const laneHeight = Math.max(440, rowTopOffset + rowCount * rowGap + 28);
  const majorTickStep = useMemo(() => getReadableTimelineTickStep(dur, timelineWidth), [dur, timelineWidth]);
  const minorTickStep = useMemo(() => getTimelineMinorTickStep(dur, majorTickStep), [dur, majorTickStep]);
  const majorTicks = useMemo(() => getTimelineTicks(dur, majorTickStep), [dur, majorTickStep]);
  const minorTicks = useMemo(() => getTimelineTicks(dur, minorTickStep), [dur, minorTickStep]);
  const playheadTime = Math.max(0, Math.min(dur, currentTime));
  const playheadPercent = timeToPercent(playheadTime);
  const playheadEdgeBuffer = Math.max(0.25, dur * 0.02);
  const playheadLabelTransform =
    playheadTime <= playheadEdgeBuffer
      ? 'translateX(6px)'
      : playheadTime >= dur - playheadEdgeBuffer
        ? 'translateX(calc(-100% - 6px))'
        : 'translateX(-50%)';
  const getTimelineTimeFromClientX = useCallback((clientX: number) => {
    const rect = timelineLaneRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const ratio = (clientX - rect.left) / Math.max(1, rect.width);
    return Math.max(0, Math.min(dur, ratio * dur));
  }, [dur, timelineLaneRef]);
  const anchorClipToolbar = useCallback((clip: TimelineClip, clientX: number) => {
    const pointerTime = getTimelineTimeFromClientX(clientX);
    const clipStart = Math.max(0, clip.timelineStart);
    const clipEnd = clipStart + Math.max(0, clip.duration);
    setClipToolbarAnchor({
      clipId: clip.id,
      time: Math.max(clipStart, Math.min(clipEnd, pointerTime ?? clipStart)),
    });
  }, [getTimelineTimeFromClientX]);
  const anchorLayerToolbar = useCallback((layer: Layer, clientX: number) => {
    const pointerTime = getTimelineTimeFromClientX(clientX);
    const layerStart = Math.max(0, layer.startTime);
    const layerEnd = Math.max(layerStart, layer.endTime);
    setLayerToolbarAnchor({
      layerId: layer.id,
      time: Math.max(layerStart, Math.min(layerEnd, pointerTime ?? layerStart)),
    });
  }, [getTimelineTimeFromClientX]);
  const selectedClip = useMemo(
    () => timelineClips.find((clip) => clip.id === selectedClipId) ?? null,
    [selectedClipId, timelineClips]
  );
  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [layers, selectedLayerId]
  );
  const selectedClipRowIndex = selectedClip ? rowIndexByItemKey.get(`clip:${selectedClip.id}`) ?? -1 : -1;
  const selectedLayerRowIndex = selectedLayer ? rowIndexByItemKey.get(`layer:${selectedLayer.id}`) ?? -1 : -1;
  const selectedClipStartTime = selectedClip ? Math.max(0, selectedClip.timelineStart) : 0;
  const selectedClipEndTime = selectedClip ? selectedClipStartTime + Math.max(0, selectedClip.duration) : 0;
  const selectedClipToolbarTime = selectedClip
    ? Math.max(
      selectedClipStartTime,
      Math.min(
        selectedClipEndTime,
        clipToolbarAnchor?.clipId === selectedClip.id ? clipToolbarAnchor.time : selectedClipStartTime
      )
    )
    : 0;
  const selectedLayerStartTime = selectedLayer ? Math.max(0, selectedLayer.startTime) : 0;
  const selectedLayerEndTime = selectedLayer ? Math.max(selectedLayerStartTime, selectedLayer.endTime) : 0;
  const selectedLayerToolbarTime = selectedLayer
    ? Math.max(
      selectedLayerStartTime,
      Math.min(
        selectedLayerEndTime,
        layerToolbarAnchor?.layerId === selectedLayer.id ? layerToolbarAnchor.time : selectedLayerStartTime
      )
    )
    : 0;
  const toolbarEdgeBuffer = Math.max(0.25, dur * 0.02);
  const selectedClipToolbarTransform =
    selectedClipToolbarTime <= toolbarEdgeBuffer
      ? 'translateX(6px)'
      : selectedClipToolbarTime >= dur - toolbarEdgeBuffer
        ? 'translateX(calc(-100% - 6px))'
        : 'translateX(-50%)';
  const selectedLayerToolbarTransform =
    selectedLayerToolbarTime <= toolbarEdgeBuffer
      ? 'translateX(6px)'
      : selectedLayerToolbarTime >= dur - toolbarEdgeBuffer
        ? 'translateX(calc(-100% - 6px))'
        : 'translateX(-50%)';
  const draggedStackItem = useMemo(
    () => stackDragPreview
      ? stackItems.find((item) => item.kind === stackDragPreview.kind && item.id === stackDragPreview.id)
      : null,
    [stackDragPreview, stackItems]
  );
  const draggedStackLabel = useMemo(() => {
    if (!draggedStackItem) return '';
    if (draggedStackItem.kind === 'layer') return draggedStackItem.layer.name;
    const asset = assetById.get(draggedStackItem.clip.assetId);
    return asset?.originalFileName ?? `${draggedStackItem.clip.type} clip`;
  }, [assetById, draggedStackItem]);

  return (
    <>
      <div className="sticky top-8 z-30 -mx-1 mb-3 rounded-2xl bg-[#18120a]/98 px-1 pb-2 pt-1 shadow-[0_16px_34px_rgba(0,0,0,0.45)] backdrop-blur">
        <TrackRow label="Time" contentWidth={timelineWidth} heightClassName="h-12">
          <div
            className="relative z-30 h-12 touch-none cursor-ew-resize rounded-xl bg-[#0d0803] p-1 shadow-[inset_0_-1px_0_rgba(242,212,11,0.22)]"
            style={{ minWidth: `${timelineWidth}px` }}
            onPointerDown={onTimelinePointerDown}
            title="Drag to scrub the timeline"
          >
            <TimelineTickStrip
              duration={dur}
              labelsEvery={majorTickStep}
              timeToPercent={timeToPercent}
              timelineWidth={timelineWidth}
            />
            <div
              className="pointer-events-none absolute bottom-1 top-1 z-40 w-0"
              style={{ left: playheadPercent }}
            >
              <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-[#f2d40b] shadow-[0_0_18px_rgba(242,212,11,0.85)]" />
              <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-[3px] bg-[#f2d40b] shadow-[0_0_14px_rgba(242,212,11,0.65)]" />
            </div>
            <span
              className="pointer-events-none absolute top-0 z-40 whitespace-nowrap rounded-full border border-[#f2d40b] bg-[#1a0c05] px-2 py-1 font-mono text-[10px] font-black leading-none text-[#fff6b0] shadow-[0_8px_18px_rgba(0,0,0,0.45),0_0_14px_rgba(242,212,11,0.32)]"
              style={{ left: playheadPercent, transform: playheadLabelTransform }}
            >
              {formatTick(playheadTime)}
            </span>
          </div>
        </TrackRow>
      </div>

      <TrackRow
        label="Main"
        contentWidth={timelineWidth}
        heightClassName="h-auto"
      >
        <div
          ref={timelineLaneRef}
          className="relative w-full rounded-xl bg-[#1a0f04] shadow-inner"
          onPointerDown={onTimelinePointerDown}
          style={{
            minWidth: `${timelineWidth}px`,
            height: laneHeight,
            backgroundImage: 'linear-gradient(to right, rgba(201,182,0,0.16) 1px, transparent 1px)',
            backgroundSize: `calc(100% / ${Math.max(1, Math.ceil(dur / 10))}) 100%`,
          }}
        >
          {stackItems.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#3d2510]">
              Empty timeline
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded">
            {minorTicks.map((tick) => (
              <div
                key={`lane-minor-${tick}`}
                className="absolute inset-y-0 border-l border-[#c9b600]/[0.07]"
                style={{ left: timeToPercent(tick) }}
              />
            ))}
            {majorTicks.map((tick) => (
              <div
                key={`lane-major-${tick}`}
                className="absolute inset-y-0 border-l border-[#f2d40b]/[0.18]"
                style={{ left: timeToPercent(tick) }}
              />
            ))}
          </div>

          {stackDragPreview ? (
            <div
              className="pointer-events-none absolute left-2 right-2 z-[26] flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-[#f2d40b] bg-[#f2d40b]/10 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f2d40b] shadow-[inset_0_0_22px_rgba(242,212,11,0.16),0_0_18px_rgba(242,212,11,0.25)] transition-[top,opacity,transform] duration-150 ease-out"
              style={{
                top: `${
                  rowTopOffset + Math.max(0, Math.min(rowCount - 1, stackDragPreview.targetIndex)) * rowGap
                }px`,
                transform: 'scale(1.01)',
              }}
            >
              Drop here
            </div>
          ) : null}

          {stackDragPreview && draggedStackItem ? (
            <div
              className="pointer-events-none fixed z-[80] w-64 max-w-[72vw] rounded-2xl border border-[#f2d40b] bg-[#1f1307]/95 px-4 py-3 text-[#fff0a6] shadow-[0_24px_54px_rgba(0,0,0,0.5),0_0_28px_rgba(242,212,11,0.32)] backdrop-blur-sm"
              style={{
                left: stackDragPreview.clientX,
                top: stackDragPreview.clientY,
                transform: 'translate(16px, -50%) rotate(-1.5deg) scale(1.04)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f2d40b] text-[#1a0c05] shadow-[0_0_18px_rgba(242,212,11,0.35)]">
                  <GripVertical size={18} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{draggedStackLabel}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#b69a4d]">
                    Drop to reorder stack
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {selectedClip && selectedClipRowIndex >= 0 ? (
            <div
              className="absolute z-[60] flex max-w-[calc(100vw-5.5rem)] items-center gap-1 overflow-hidden rounded-xl border border-[#5a3f11] bg-[#1a0c05]/95 p-1 text-[#fff0a6] shadow-[0_14px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(242,212,11,0.16)] backdrop-blur"
              style={{
                left: timeToPercent(selectedClipToolbarTime),
                top: `${Math.max(6, rowTopOffset + selectedClipRowIndex * rowGap - 42)}px`,
                transform: selectedClipToolbarTransform,
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClip(selectedClip.id);
                }}
                className="flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg bg-[#2a0705] px-2 text-red-200 ring-1 ring-red-300/25 hover:bg-red-950 hover:text-white"
                title="Delete clip"
                aria-label="Delete clip"
              >
                <Trash2 size={14} />
                <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:inline">Delete</span>
              </button>
              {selectedClip.type === 'video' ? (
                <button
                  type="button"
                  disabled={selectedClip.duration < MIN_CLIP_DURATION * 2}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedClip.duration >= MIN_CLIP_DURATION * 2) onSplitClip(selectedClip.id);
                  }}
                  className={`flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2 ring-1 ${
                    selectedClip.duration >= MIN_CLIP_DURATION * 2
                      ? 'bg-[#241b05] text-[#fff0a6] ring-[#f2d40b]/30 hover:bg-[#f2d40b] hover:text-[#1a0c05]'
                      : 'cursor-not-allowed bg-black/35 text-[#6f6040] ring-white/10'
                  }`}
                  title={selectedClip.duration >= MIN_CLIP_DURATION * 2 ? 'Split video into two equal parts' : 'Video must be at least 6s to split'}
                  aria-label="Split video clip"
                >
                  <Scissors size={14} />
                  <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:inline">Split</span>
                </button>
              ) : null}
              {selectedClip.type === 'video' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleClipMute(selectedClip.id);
                  }}
                  className="flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg bg-[#241b05] px-2 text-[#fff0a6] ring-1 ring-[#f2d40b]/25 hover:bg-[#f2d40b] hover:text-[#1a0c05]"
                  title={selectedClip.muted ? 'Unmute clip' : 'Mute clip'}
                  aria-label={selectedClip.muted ? 'Unmute clip' : 'Mute clip'}
                >
                  {selectedClip.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:inline">
                    {selectedClip.muted ? 'Unmute' : 'Mute'}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}

          {selectedLayer && selectedLayerRowIndex >= 0 ? (
            <div
              className="absolute z-[60] flex max-w-[calc(100vw-5.5rem)] items-center gap-1 overflow-hidden rounded-xl border border-[#5a3f11] bg-[#1a0c05]/95 p-1 text-[#fff0a6] shadow-[0_14px_30px_rgba(0,0,0,0.45),0_0_18px_rgba(242,212,11,0.16)] backdrop-blur"
              style={{
                left: timeToPercent(selectedLayerToolbarTime),
                top: `${Math.max(6, rowTopOffset + selectedLayerRowIndex * rowGap - 42)}px`,
                transform: selectedLayerToolbarTransform,
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteLayer(selectedLayer.id);
                }}
                className="flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg bg-[#2a0705] px-2 text-red-200 ring-1 ring-red-300/25 hover:bg-red-950 hover:text-white"
                title="Delete item"
                aria-label="Delete item"
              >
                <Trash2 size={14} />
                <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:inline">Delete</span>
              </button>
              {selectedLayer.type === 'audio' ? (
                <button
                  type="button"
                  disabled={selectedLayer.endTime - selectedLayer.startTime < MIN_CLIP_DURATION * 2}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedLayer.endTime - selectedLayer.startTime >= MIN_CLIP_DURATION * 2) {
                      onSplitLayer(selectedLayer.id);
                    }
                  }}
                  className={`flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2 ring-1 ${
                    selectedLayer.endTime - selectedLayer.startTime >= MIN_CLIP_DURATION * 2
                      ? 'bg-[#241b05] text-[#fff0a6] ring-[#f2d40b]/30 hover:bg-[#f2d40b] hover:text-[#1a0c05]'
                      : 'cursor-not-allowed bg-black/35 text-[#6f6040] ring-white/10'
                  }`}
                  title={selectedLayer.endTime - selectedLayer.startTime >= MIN_CLIP_DURATION * 2 ? 'Split audio into two equal parts' : 'Audio must be at least 6s to split'}
                  aria-label="Split audio layer"
                >
                  <Scissors size={14} />
                  <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:inline">Split</span>
                </button>
              ) : null}
              {selectedLayer.type === 'audio' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLayerMute(selectedLayer.id);
                  }}
                  className="flex min-h-9 min-w-9 items-center justify-center gap-1 rounded-lg bg-[#241b05] px-2 text-[#fff0a6] ring-1 ring-[#f2d40b]/25 hover:bg-[#f2d40b] hover:text-[#1a0c05]"
                  title={selectedLayer.mediaMuted ? 'Unmute audio' : 'Mute audio'}
                  aria-label={selectedLayer.mediaMuted ? 'Unmute audio' : 'Mute audio'}
                >
                  {selectedLayer.mediaMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:inline">
                    {selectedLayer.mediaMuted ? 'Unmute' : 'Mute'}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}

          {stackItems.map((item, index) => {
            const itemKey = item.kind === 'clip' ? `clip:${item.id}` : `layer:${item.id}`;
            const rowIndex = rowIndexByItemKey.get(itemKey) ?? index;
            const top = rowTopOffset + rowIndex * rowGap;

            if (item.kind === 'clip') {
              const clip = item.clip;
              const asset = assetById.get(clip.assetId);
              const left = `${(clip.timelineStart / dur) * 100}%`;
              const clipDuration = Math.max(0, clip.duration);
              const width = `${(clipDuration / dur) * 100}%`;
              const clipPixelWidth = (clipDuration / dur) * Math.max(1, timelineWidth);
              const showFullTimeLabels = clipPixelWidth >= 96;
              const showCompactTimeLabel = !showFullTimeLabels && clipPixelWidth >= 24;
              const compactClip = clipPixelWidth < 64;
              const selected = clip.id === selectedClipId;
              const isVideo = clip.type === 'video';
              const isImage = clip.type === 'image';
              const isStackDragging = stackDragPreview?.kind === 'clip' && stackDragPreview.id === clip.id;
              const clipEnd = clip.timelineStart + clip.duration;

              return (
                <div
                  key={`clip-${clip.id}`}
                  className={`group absolute h-28 overflow-hidden ${compactClip ? 'rounded-md' : 'rounded-xl'} border ${
                    selected
                      ? 'bg-[#c9b600] border-[#f0dd2a] text-[#1a0c05]'
                      : isVideo
                        ? 'bg-[#3b360d] border-[#7b7d20] text-[#e8d5a0] hover:border-[#c9b600]'
                        : 'bg-[#183129] border-[#31725f] text-[#d6f5e8] hover:border-[#55caa5]'
                  } touch-none cursor-grab transition-[transform,opacity,box-shadow,border-color] duration-150 ease-out active:cursor-grabbing`}
                  style={{
                    left,
                    top,
                    width,
                    zIndex: isStackDragging ? 35 : selected ? 30 : 20,
                    opacity: isStackDragging ? 0.34 : 1,
                    transform: isStackDragging ? 'scale(0.98)' : 'scale(1)',
                    boxShadow: isStackDragging ? 'inset 0 0 0 2px rgba(242,212,11,0.55)' : undefined,
                  }}
                  onPointerDown={(e) => {
                    anchorClipToolbar(clip, e.clientX);
                    onClipPointerDown(e, clip, 'move');
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    anchorClipToolbar(clip, e.clientX);
                    onSelectClip(clip.id);
                  }}
                  title={`${clip.timelineStart.toFixed(2)}s-${clipEnd.toFixed(2)}s`}
                >
                  <TimelineClipPreview asset={asset} clip={clip} timelinePixelWidth={clipPixelWidth} />
                  <div className="absolute inset-0 bg-black/35" />
                  {isVideo || isImage ? (
                    <>
                      {isVideo ? (
                        <div
                          className={`${compactClip ? 'w-2' : 'w-5 sm:w-4'} absolute left-0 top-0 z-20 h-full touch-none cursor-ew-resize bg-[#f2d40b]/75 opacity-80 hover:opacity-100`}
                          onPointerDown={(e) => onClipPointerDown(e, clip, 'start')}
                          title="Trim start"
                        />
                      ) : null}
                      <div
                        className={`${compactClip ? 'w-2' : 'w-5 sm:w-4'} absolute right-0 top-0 z-20 h-full touch-none cursor-ew-resize opacity-80 hover:opacity-100 ${
                          isImage ? 'bg-[#55caa5]/80' : 'bg-[#f2d40b]/75'
                        }`}
                        onPointerDown={(e) => onClipPointerDown(e, clip, 'end')}
                        title={isImage ? 'Change image duration' : 'Trim end'}
                      />
                    </>
                  ) : null}
                  {showFullTimeLabels ? (
                    <>
                      <div className="pointer-events-none absolute bottom-1 left-2 z-20 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#fff0a6] opacity-80 ring-1 ring-white/10 group-hover:opacity-100">
                        {formatTick(clip.timelineStart)}
                      </div>
                      <div className="pointer-events-none absolute bottom-1 right-2 z-20 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#fff0a6] opacity-80 ring-1 ring-white/10 group-hover:opacity-100">
                        {formatTick(clipEnd)}
                      </div>
                    </>
                  ) : showCompactTimeLabel ? (
                    <div className="pointer-events-none absolute bottom-1 left-1/2 z-20 -translate-x-1/2 rounded bg-black/75 px-1 py-0.5 font-mono text-[8px] font-bold leading-none text-[#fff0a6]">
                      {formatTick(clipDuration)}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClipPointerDown(e, clip, 'z');
                    }}
                    className={`absolute z-20 flex touch-none cursor-grab items-center justify-center border border-[#7b6a2b] bg-black/70 text-[#e7cf7f] transition-transform active:scale-95 active:cursor-grabbing hover:text-[#f2d40b] ${
                      compactClip ? 'bottom-1 left-1 h-6 w-6 rounded' : 'left-2 top-12 h-8 w-8 rounded-md'
                    }`}
                    title="Drag to change stack order"
                  >
                    <GripVertical size={16} />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      anchorClipToolbar(clip, e.clientX);
                      onSelectClip(clip.id);
                      onOpenItemEditor?.();
                    }}
                    className={`absolute z-30 flex touch-manipulation items-center justify-center border border-[#f2d40b]/45 bg-[#120a02]/90 text-[#f2d40b] shadow-[0_8px_18px_rgba(0,0,0,0.34)] transition-transform active:scale-95 hover:bg-[#f2d40b] hover:text-[#1a0c05] ${
                      compactClip ? 'right-1 top-1 h-6 w-6 rounded' : 'right-2 top-2 h-8 w-8 rounded-lg'
                    }`}
                    title="Open object editor"
                    aria-label="Open object editor"
                  >
                    <Settings2 size={compactClip ? 13 : 15} />
                  </button>
                  <div className="relative z-10 h-full min-w-0" />
                </div>
              );
            }

            const layer = item.layer;
            const left = `${(layer.startTime / dur) * 100}%`;
            const layerDuration = Math.max(0, layer.endTime - layer.startTime);
            const width = `${(layerDuration / dur) * 100}%`;
            const layerPixelWidth = (layerDuration / dur) * Math.max(1, timelineWidth);
            const compactLayer = layerPixelWidth < 64;
            const selected = layer.id === selectedLayerId;
            const isStackDragging = stackDragPreview?.kind === 'layer' && stackDragPreview.id === layer.id;

            return (
              <div
                key={`layer-${layer.id}`}
                className={`absolute h-28 overflow-hidden ${compactLayer ? 'rounded-md' : 'rounded-xl'} border ${
                  selected
                    ? 'bg-[#c9b600] border-[#f0dd2a] text-[#1a0c05]'
                    : 'bg-[#2e2340] border-[#6f5790] text-[#eadfff] hover:border-[#b79bea]'
                } touch-none cursor-grab transition-[transform,opacity,box-shadow,border-color] duration-150 ease-out active:cursor-grabbing`}
                style={{
                  left,
                  top,
                  width,
                  zIndex: isStackDragging ? 34 : selected ? 28 : 18,
                  opacity: isStackDragging ? 0.34 : 1,
                  transform: isStackDragging ? 'scale(0.98)' : 'scale(1)',
                  boxShadow: isStackDragging ? 'inset 0 0 0 2px rgba(242,212,11,0.55)' : undefined,
                }}
                onPointerDown={(e) => {
                  anchorLayerToolbar(layer, e.clientX);
                  onLayerPointerDown(e, layer, 'move');
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  anchorLayerToolbar(layer, e.clientX);
                  onSelectLayer(layer.id);
                }}
                title={`${layer.startTime.toFixed(2)}s-${layer.endTime.toFixed(2)}s`}
              >
                <div
                  className={`${compactLayer ? 'w-2' : 'w-5 sm:w-4'} absolute left-0 top-0 z-10 h-full touch-none cursor-ew-resize bg-[#f2d40b]/70`}
                  onPointerDown={(e) => onLayerPointerDown(e, layer, 'start')}
                />
                <div className="absolute inset-0 bg-black/45" />
                <TimelineLayerPreview layer={layer} />
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLayerPointerDown(e, layer, 'z');
                  }}
                  className={`absolute z-20 flex touch-none cursor-grab items-center justify-center border border-[#7b6a2b] bg-black/70 text-[#e7cf7f] transition-transform active:scale-95 active:cursor-grabbing hover:text-[#f2d40b] ${
                    compactLayer ? 'bottom-1 left-1 h-6 w-6 rounded' : 'left-2 top-12 h-8 w-8 rounded-md'
                  }`}
                  title="Drag to change stack order"
                >
                  <GripVertical size={16} />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    anchorLayerToolbar(layer, e.clientX);
                    onSelectLayer(layer.id);
                    onOpenItemEditor?.();
                  }}
                  className={`absolute z-30 flex touch-manipulation items-center justify-center border border-[#f2d40b]/45 bg-[#120a02]/90 text-[#f2d40b] shadow-[0_8px_18px_rgba(0,0,0,0.34)] transition-transform active:scale-95 hover:bg-[#f2d40b] hover:text-[#1a0c05] ${
                    compactLayer ? 'right-1 top-1 h-6 w-6 rounded' : 'right-2 top-2 h-8 w-8 rounded-lg'
                  }`}
                  title="Open object editor"
                  aria-label="Open object editor"
                >
                  <Settings2 size={compactLayer ? 13 : 15} />
                </button>
                <div
                  className={`${compactLayer ? 'w-2' : 'w-5 sm:w-4'} absolute right-0 top-0 z-10 h-full touch-none cursor-ew-resize bg-[#f2d40b]/70`}
                  onPointerDown={(e) => onLayerPointerDown(e, layer, 'end')}
                />
              </div>
            );
          })}

          <Playhead left={playheadPercent} onPointerDown={onPlayheadPointerDown} />
        </div>
      </TrackRow>
    </>
  );
}
