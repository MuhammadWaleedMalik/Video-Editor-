/* eslint-disable @next/next/no-img-element */

import { memo, useEffect, useMemo, useState } from 'react';
import { AudioLines, GripVertical, Trash2, Volume2, VolumeX } from 'lucide-react';
import { CanvasObject, Layer, MediaAsset, TimelineClip } from '@/types/editor';
import { getTimelineStackItems } from './timelineModel';
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
  onToggleClipMute: (id: string) => void;
  onDeleteClip: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  stackDragPreview: { kind: 'clip' | 'layer'; id: string; targetIndex: number } | null;
}

interface ClipPreviewProps {
  asset?: MediaAsset;
  clip: TimelineClip;
}

const IMAGE_TILE_INDICES = Array.from({ length: 8 }, (_, index) => index);
const TIMELINE_FRAME_WIDTH = 120;
const TIMELINE_FRAME_HEIGHT = 68;
const TIMELINE_FRAME_BUILD_DELAY_MS = 120;
const MAX_TIMELINE_FRAME_CACHE_SIZE = 64;
const timelineFrameCache = new Map<string, string[]>();
const timelineFrameRequests = new Map<string, Promise<string[]>>();

function getFrameCacheKey(asset: MediaAsset, clip: TimelineClip, frameCount: number) {
  return [
    asset.id,
    asset.url,
    clip.sourceStart.toFixed(3),
    clip.duration.toFixed(3),
    clip.sourceEnd.toFixed(3),
    frameCount,
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

const TimelineClipPreview = memo(function TimelineClipPreview({ asset, clip }: ClipPreviewProps) {
  const [frames, setFrames] = useState<string[]>([]);
  const frameCount = useMemo(() => {
    const byDuration = Math.ceil(Math.max(clip.duration, 1) / 1.5);
    return Math.max(4, Math.min(18, byDuration));
  }, [clip.duration]);
  const frameCacheKey = asset && asset.type === 'video' && asset.status === 'deployed'
    ? getFrameCacheKey(asset, clip, frameCount)
    : '';

  useEffect(() => {
    let cancelled = false;
    if (!asset || asset.status !== 'deployed') {
      setFrames([]);
      return;
    }
    if (asset.type === 'image') {
      setFrames((previous) => (previous.length === 1 && previous[0] === asset.url ? previous : [asset.url]));
      return;
    }

    const cached = timelineFrameCache.get(frameCacheKey);
    if (cached) {
      setFrames(cached);
      return;
    }

    setFrames([]);
    const timeout = window.setTimeout(() => {
      requestTimelineFrames(asset, clip, frameCount)
        .then((nextFrames) => {
          if (!cancelled) setFrames(nextFrames);
        })
        .catch(() => {
          if (!cancelled) setFrames([]);
        });
    }, TIMELINE_FRAME_BUILD_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [asset, clip.duration, clip.sourceEnd, clip.sourceStart, frameCacheKey, frameCount]);

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
    <div className="absolute inset-0 flex">
      {frames.map((frame, index) => (
        <img key={`${frame}-${index}`} src={frame} alt="" className="h-full min-w-[58px] flex-1 object-cover opacity-85" />
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
  onLayerPointerDown,
  onClipPointerDown,
  onSelectClip,
  onSelectLayer,
  onToggleClipMute,
  onDeleteClip,
  onDeleteLayer,
  stackDragPreview,
}: TimelineRowsProps) {
  const assetById = useMemo(() => new Map(mediaAssets.map((asset) => [asset.id, asset])), [mediaAssets]);
  const stackItems = useMemo(
    () => getTimelineStackItems(layers, timelineClips, canvasObjects),
    [canvasObjects, layers, timelineClips]
  );
  const rowGap = 118;
  const rowCount = Math.max(stackItems.length, 1);
  const laneHeight = Math.max(320, rowCount * rowGap + 36);
  const majorTickStep = useMemo(() => getTimelineTickStep(dur), [dur]);
  const minorTickStep = useMemo(() => getTimelineMinorTickStep(dur, majorTickStep), [dur, majorTickStep]);
  const majorTicks = useMemo(() => getTimelineTicks(dur, majorTickStep), [dur, majorTickStep]);
  const minorTicks = useMemo(() => getTimelineTicks(dur, minorTickStep), [dur, minorTickStep]);
  const selectedClip = useMemo(
    () => timelineClips.find((clip) => clip.id === selectedClipId),
    [selectedClipId, timelineClips]
  );
  const selectedClipIndex = useMemo(
    () => selectedClip
      ? stackItems.findIndex((item) => item.kind === 'clip' && item.id === selectedClip.id)
      : -1,
    [selectedClip, stackItems]
  );
  const selectedClipLeft = useMemo(
    () => selectedClip ? `${(selectedClip.timelineStart / dur) * 100}%` : '0%',
    [dur, selectedClip]
  );
  const selectedClipWidth = useMemo(
    () => selectedClip ? `${Math.max(0.5, (selectedClip.duration / dur) * 100)}%` : '0%',
    [dur, selectedClip]
  );
  const selectedClipTop = selectedClip && selectedClipIndex >= 0 ? 10 + selectedClipIndex * rowGap : 0;
  const rowTopOffset = 10;

  return (
    <>
      <div className="sticky top-8 z-30 bg-[#18120a] pb-3">
        <TrackRow label="Time" contentWidth={timelineWidth} heightClassName="h-10">
          <TimelineTickStrip duration={dur} timeToPercent={timeToPercent} timelineWidth={timelineWidth} />
        </TrackRow>
      </div>

      <TrackRow
        label="Main"
        contentWidth={timelineWidth}
        heightClassName="h-auto"
      >
        <div
          ref={timelineLaneRef}
          className="relative w-full rounded bg-[#1a0f04] shadow-inner"
          style={{
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
              className="pointer-events-none absolute left-0 right-0 z-10 h-[3px] rounded-full bg-[#f2d40b] shadow-[0_0_14px_rgba(242,212,11,0.75)]"
              style={{
                top: `${
                  rowTopOffset + stackDragPreview.targetIndex * rowGap
                }px`,
              }}
            />
          ) : null}

          {selectedClip ? (
            <div
              className="absolute z-40 flex items-center gap-1 rounded bg-[#2d1a08]/95 px-1 py-1 shadow-lg ring-1 ring-[#5a3f11]"
              style={{
                left: `calc(${selectedClipLeft} + (${selectedClipWidth} / 2))`,
                top: `${Math.max(0, selectedClipTop - 22)}px`,
                transform: 'translateX(-50%)',
              }}
            >
              {selectedClip.type === 'video' ? (
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleClipMute(selectedClip.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded bg-black/55 text-[#e8d5a0] hover:text-[#f2d40b]"
                  title={selectedClip.muted ? 'Unmute clip' : 'Mute clip'}
                >
                  {selectedClip.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              ) : null}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteClip(selectedClip.id);
                }}
                className="flex h-7 w-7 items-center justify-center rounded bg-black/55 text-[#dcb4b4] hover:text-red-200"
                title="Delete clip"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : null}

          {stackItems.map((item, index) => {
            const top = rowTopOffset + index * rowGap;

            if (item.kind === 'clip') {
              const clip = item.clip;
              const asset = assetById.get(clip.assetId);
              const left = `${(clip.timelineStart / dur) * 100}%`;
              const width = `${Math.max(0.5, (clip.duration / dur) * 100)}%`;
              const selected = clip.id === selectedClipId;
              const isVideo = clip.type === 'video';
              const isImage = clip.type === 'image';
              const isStackDragging = stackDragPreview?.kind === 'clip' && stackDragPreview.id === clip.id;
              const clipEnd = clip.timelineStart + clip.duration;

              return (
                <div
                  key={`clip-${clip.id}`}
                  className={`group absolute h-24 overflow-hidden rounded border ${
                    selected
                      ? 'bg-[#c9b600] border-[#f0dd2a] text-[#1a0c05]'
                      : isVideo
                        ? 'bg-[#3b360d] border-[#7b7d20] text-[#e8d5a0] hover:border-[#c9b600]'
                        : 'bg-[#183129] border-[#31725f] text-[#d6f5e8] hover:border-[#55caa5]'
                  } touch-none cursor-grab active:cursor-grabbing`}
                  style={{
                    left,
                    top,
                    width: `max(96px, ${width})`,
                    zIndex: isStackDragging ? 35 : selected ? 30 : 20,
                    opacity: isStackDragging ? 0.78 : 1,
                    transform: isStackDragging ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isStackDragging ? '0 0 0 2px rgba(242,212,11,0.5), 0 12px 22px rgba(0,0,0,0.28)' : undefined,
                  }}
                  onPointerDown={(e) => onClipPointerDown(e, clip, 'move')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip.id);
                  }}
                  title={`${clip.timelineStart.toFixed(2)}s-${clipEnd.toFixed(2)}s`}
                >
                  <TimelineClipPreview asset={asset} clip={clip} />
                  <div className="absolute inset-0 bg-black/35" />
                  {isVideo || isImage ? (
                    <>
                      {isVideo ? (
                        <div
                          className="absolute left-0 top-0 z-20 h-full w-4 touch-none cursor-ew-resize bg-[#f2d40b]/75 opacity-80 hover:opacity-100 sm:w-3"
                          onPointerDown={(e) => onClipPointerDown(e, clip, 'start')}
                          title="Trim start"
                        />
                      ) : null}
                      <div
                        className={`absolute right-0 top-0 z-20 h-full w-4 touch-none cursor-ew-resize opacity-80 hover:opacity-100 sm:w-3 ${
                          isImage ? 'bg-[#55caa5]/80' : 'bg-[#f2d40b]/75'
                        }`}
                        onPointerDown={(e) => onClipPointerDown(e, clip, 'end')}
                        title={isImage ? 'Change image duration' : 'Trim end'}
                      />
                    </>
                  ) : null}
                  <div className="pointer-events-none absolute bottom-1 left-2 z-20 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#fff0a6] opacity-80 ring-1 ring-white/10 group-hover:opacity-100">
                    {formatTick(clip.timelineStart)}
                  </div>
                  <div className="pointer-events-none absolute bottom-1 right-2 z-20 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#fff0a6] opacity-80 ring-1 ring-white/10 group-hover:opacity-100">
                    {formatTick(clipEnd)}
                  </div>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onClipPointerDown(e, clip, 'z');
                    }}
                    className="absolute left-3 top-3 z-20 flex h-9 w-9 touch-none cursor-grab items-center justify-center rounded-md border border-[#7b6a2b] bg-black/70 text-[#e7cf7f] active:cursor-grabbing hover:text-[#f2d40b] sm:h-8 sm:w-8"
                    title="Drag to change stack order"
                  >
                    <GripVertical size={16} />
                  </button>
                  <div className="relative z-10 h-full min-w-0" />
                </div>
              );
            }

            const layer = item.layer;
            const left = `${(layer.startTime / dur) * 100}%`;
            const width = `${Math.max(0.5, ((layer.endTime - layer.startTime) / dur) * 100)}%`;
            const selected = layer.id === selectedLayerId;
            const isStackDragging = stackDragPreview?.kind === 'layer' && stackDragPreview.id === layer.id;

            return (
              <div
                key={`layer-${layer.id}`}
                className={`absolute h-24 overflow-hidden rounded border ${
                  selected
                    ? 'bg-[#c9b600] border-[#f0dd2a] text-[#1a0c05]'
                    : 'bg-[#2e2340] border-[#6f5790] text-[#eadfff] hover:border-[#b79bea]'
                }`}
                style={{
                  left,
                  top,
                  width: `max(96px, ${width})`,
                  zIndex: isStackDragging ? 34 : selected ? 28 : 18,
                  opacity: isStackDragging ? 0.78 : 1,
                  transform: isStackDragging ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isStackDragging ? '0 0 0 2px rgba(242,212,11,0.5), 0 12px 22px rgba(0,0,0,0.28)' : undefined,
                }}
                onPointerDown={(e) => onLayerPointerDown(e, layer, 'move')}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLayer(layer.id);
                }}
                title={`${layer.startTime.toFixed(2)}s-${layer.endTime.toFixed(2)}s`}
              >
                <div
                  className="absolute left-0 top-0 z-10 h-full w-4 touch-none cursor-ew-resize bg-[#f2d40b]/70 sm:w-2"
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
                  className="absolute left-3 top-3 z-20 flex h-9 w-9 touch-none cursor-grab items-center justify-center rounded-md border border-[#7b6a2b] bg-black/70 text-[#e7cf7f] active:cursor-grabbing hover:text-[#f2d40b] sm:h-8 sm:w-8"
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
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                  className="absolute right-1 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded bg-black/55 hover:text-red-200"
                  title="Delete item"
                >
                  <Trash2 size={13} />
                </button>
                <div
                  className="absolute right-0 top-0 z-10 h-full w-4 touch-none cursor-ew-resize bg-[#f2d40b]/70 sm:w-2"
                  onPointerDown={(e) => onLayerPointerDown(e, layer, 'end')}
                />
              </div>
            );
          })}

          <Playhead left={timeToPercent(currentTime)} onPointerDown={onPlayheadPointerDown} />
        </div>
      </TrackRow>
    </>
  );
}
