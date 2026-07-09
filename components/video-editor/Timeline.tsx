'use client';

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { CanvasObject, Layer, MediaAsset, TimelineClip } from '@/types/editor';
import { getTimelineStackItems, MAX_TIMELINE_DURATION_SECONDS } from './timelineModel';
import TimelineRows from './TimelineRows';

interface TimelineProps {
  duration: number;
  currentTime: number;
  layers: Layer[];
  selectedLayerId: string | null;
  onSeek: (time: number) => void;
  onSelectLayer: (id: string | null) => void;
  onDeleteLayer: (id: string) => void;
  onLayerTimingChange: (id: string, startTime: number, endTime: number) => void;
  onSplitLayer: (id: string) => void;
  onToggleLayerMute: (id: string) => void;
  onLayerStackOrderChange: (id: string, targetIndex: number) => void;
  mediaAssets: MediaAsset[];
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onMoveClip: (id: string, timelineStart: number) => void;
  onTrimClip: (id: string, edge: 'start' | 'end', sourceTime: number) => void;
  onSplitClip: (id: string) => void;
  onClipOrderChange: (id: string, targetIndex: number) => void;
  onToggleClipMute: (id: string) => void;
  onDeleteClip: (id: string) => void;
}

type DragTarget = 'playhead' | null;
type LayerDragMode = 'move' | 'start' | 'end' | 'z';
type ClipDragMode = 'move' | 'start' | 'end' | 'z';
type LayerDragState = {
  id: string;
  mode: LayerDragMode;
  startClientX: number;
  startScrollLeft: number;
  originalStart: number;
  originalEnd: number;
};
type ClipDragState = {
  id: string;
  mode: ClipDragMode;
  startClientX: number;
  startScrollLeft: number;
  originalStart: number;
  originalEnd: number;
  originalSourceStart: number;
  originalSourceEnd: number;
};
type StackDragPreview =
  | { kind: 'clip'; id: string; targetIndex: number; clientX: number; clientY: number }
  | { kind: 'layer'; id: string; targetIndex: number; clientX: number; clientY: number }
  | null;

const TIMELINE_PIXELS_PER_SECOND = 30;
const FIT_TIMELINE_PIXELS_PER_SECOND = 0;
const MIN_TIMELINE_PIXELS_PER_SECOND = 12;
const MAX_TIMELINE_PIXELS_PER_SECOND = 90;
const MIN_TIMELINE_WIDTH = 1280;
const FIT_TIMELINE_GUTTER_PX = 116;
const MIN_FIT_TIMELINE_WIDTH = 240;
const STACK_ROW_TOP = 54;
const STACK_ROW_HEIGHT = 156;
const STACK_AUTO_SCROLL_EDGE_PX = 76;
const STACK_AUTO_SCROLL_MAX_SPEED = 18;
const TIMELINE_AUTO_SCROLL_EDGE_PX = 96;
const TIMELINE_AUTO_SCROLL_MAX_SPEED = 24;

function getTimelineLayerRowKey(layer: Layer) {
  return layer.type === 'audio' ? `audio-group:${layer.timelineGroupId ?? layer.id}` : `layer:${layer.id}`;
}

function getTimelineClipRowKey(clip: TimelineClip) {
  return `clip-group:${clip.timelineGroupId ?? clip.canvasObjectId}`;
}

function clampTimelinePixelsPerSecond(value: number) {
  if (!Number.isFinite(value)) return TIMELINE_PIXELS_PER_SECOND;
  if (value <= FIT_TIMELINE_PIXELS_PER_SECOND) return FIT_TIMELINE_PIXELS_PER_SECOND;
  return Math.max(MIN_TIMELINE_PIXELS_PER_SECOND, Math.min(MAX_TIMELINE_PIXELS_PER_SECOND, value));
}

export default function Timeline({
  duration,
  currentTime,
  layers,
  selectedLayerId,
  onSeek,
  onSelectLayer,
  onDeleteLayer,
  onLayerTimingChange,
  onSplitLayer,
  onToggleLayerMute,
  onLayerStackOrderChange,
  mediaAssets,
  timelineClips,
  canvasObjects,
  selectedClipId,
  onSelectClip,
  onMoveClip,
  onTrimClip,
  onSplitClip,
  onClipOrderChange,
  onToggleClipMute,
  onDeleteClip,
}: TimelineProps) {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const timelineLaneRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<DragTarget>(null);
  const layerDragging = useRef<LayerDragState | null>(null);
  const clipDragging = useRef<ClipDragState | null>(null);
  const activePointerId = useRef<number | null>(null);
  const stackAutoScrollFrame = useRef<number | null>(null);
  const stackAutoScrollSpeed = useRef(0);
  const stackAutoScrollPointer = useRef<{ clientX: number; clientY: number } | null>(null);
  const timelineAutoScrollFrame = useRef<number | null>(null);
  const timelineAutoScrollSpeed = useRef(0);
  const timelineAutoScrollPointer = useRef<{ clientX: number; clientY: number } | null>(null);
  const timelineAutoScrollCommit = useRef<((clientX: number, clientY: number) => void) | null>(null);
  const [stackDragPreview, setStackDragPreview] = useState<StackDragPreview>(null);
  const [timelinePixelsPerSecond, setTimelinePixelsPerSecond] = useState(FIT_TIMELINE_PIXELS_PER_SECOND);
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(MIN_TIMELINE_WIDTH);

  const dur = MAX_TIMELINE_DURATION_SECONDS;
  const fitTimelineWidth = Math.max(MIN_FIT_TIMELINE_WIDTH, timelineViewportWidth - FIT_TIMELINE_GUTTER_PX);
  const timelineWidth = timelinePixelsPerSecond === FIT_TIMELINE_PIXELS_PER_SECOND
    ? fitTimelineWidth
    : Math.max(MIN_TIMELINE_WIDTH, Math.ceil(dur * timelinePixelsPerSecond));
  const timelineZoomLabel = timelinePixelsPerSecond === FIT_TIMELINE_PIXELS_PER_SECOND
    ? 'Fit 3m'
    : `${Math.round((timelinePixelsPerSecond / TIMELINE_PIXELS_PER_SECOND) * 100)}%`;
  const stackItems = useMemo(
    () => getTimelineStackItems(layers, timelineClips, canvasObjects),
    [canvasObjects, layers, timelineClips]
  );
  const stackRowInfo = useMemo(() => {
    const rows: Array<{ key: string; firstStackIndex: number; itemKeys: string[] }> = [];
    const rowIndexByKey = new Map<string, number>();
    const rowIndexByItemKey = new Map<string, number>();

    stackItems.forEach((item, stackIndex) => {
      const rowKey = item.kind === 'clip' ? getTimelineClipRowKey(item.clip) : getTimelineLayerRowKey(item.layer);
      const itemKey = item.kind === 'clip' ? `clip:${item.id}` : `layer:${item.id}`;
      const existingIndex = rowIndexByKey.get(rowKey);
      if (existingIndex !== undefined) {
        rows[existingIndex].itemKeys.push(itemKey);
        rowIndexByItemKey.set(itemKey, existingIndex);
        return;
      }

      const rowIndex = rows.length;
      rowIndexByKey.set(rowKey, rowIndex);
      rowIndexByItemKey.set(itemKey, rowIndex);
      rows.push({ key: rowKey, firstStackIndex: stackIndex, itemKeys: [itemKey] });
    });

    return { rows, rowIndexByItemKey };
  }, [stackItems]);
  const stackRowCount = stackRowInfo.rows.length;
  const timeToPercent = useCallback((t: number) => `${(t / dur) * 100}%`, [dur]);

  const getTimeFromX = useCallback(
    (clientX: number): number => {
      const timelineLane = timelineLaneRef.current;
      const track = trackAreaRef.current;
      const rect = timelineLane?.getBoundingClientRect() ?? track?.getBoundingClientRect();
      if (!rect) return 0;
      const x = clientX - rect.left;
      return Math.max(0, Math.min(dur, (x / Math.max(1, rect.width)) * dur));
    },
    [dur]
  );

  const startPlayheadDrag = useCallback((clientX: number) => {
    dragging.current = 'playhead';
    onSeek(getTimeFromX(clientX));
  }, [getTimeFromX, onSeek]);

  const adjustTimelineZoom = useCallback((delta: number) => {
    setTimelinePixelsPerSecond((previous) => {
      if (previous === FIT_TIMELINE_PIXELS_PER_SECOND && delta > 0) return TIMELINE_PIXELS_PER_SECOND;
      return clampTimelinePixelsPerSecond(previous + delta);
    });
  }, []);

  const onTimelineWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.altKey) return;
    event.preventDefault();
    adjustTimelineZoom(event.deltaY < 0 ? 4 : -4);
  }, [adjustTimelineZoom]);

  const stopStackAutoScroll = useCallback(() => {
    stackAutoScrollSpeed.current = 0;
    stackAutoScrollPointer.current = null;
    if (stackAutoScrollFrame.current) {
      cancelAnimationFrame(stackAutoScrollFrame.current);
      stackAutoScrollFrame.current = null;
    }
  }, []);

  const stopTimelineAutoScroll = useCallback(() => {
    timelineAutoScrollSpeed.current = 0;
    timelineAutoScrollPointer.current = null;
    if (timelineAutoScrollFrame.current) {
      cancelAnimationFrame(timelineAutoScrollFrame.current);
      timelineAutoScrollFrame.current = null;
    }
  }, []);

  const getStackTargetIndex = useCallback((clientY: number) => {
    const track = trackAreaRef.current;
    if (!track || stackRowCount === 0) return 0;
    const rect = track.getBoundingClientRect();
    const row = Math.floor((clientY - rect.top + track.scrollTop - STACK_ROW_TOP) / STACK_ROW_HEIGHT);
    return Math.max(0, Math.min(stackRowCount - 1, row));
  }, [stackRowCount]);

  const commitStackDrag = useCallback((
    kind: 'clip' | 'layer',
    id: string,
    clientX: number,
    clientY: number
  ) => {
    const currentRowIndex = stackRowInfo.rowIndexByItemKey.get(`${kind}:${id}`);
    if (currentRowIndex === undefined) return;

    const targetIndex = getStackTargetIndex(clientY);
    setStackDragPreview({ kind, id, targetIndex, clientX, clientY });
    if (targetIndex === currentRowIndex) return;

    const targetStackIndex = stackRowInfo.rows[targetIndex]?.firstStackIndex ?? targetIndex;

    if (kind === 'clip') {
      onClipOrderChange(id, targetStackIndex);
    } else {
      onLayerStackOrderChange(id, targetStackIndex);
    }
  }, [getStackTargetIndex, onClipOrderChange, onLayerStackOrderChange, stackRowInfo]);

  const runStackAutoScroll = useCallback(() => {
    const track = trackAreaRef.current;
    const pointer = stackAutoScrollPointer.current;
    const speed = stackAutoScrollSpeed.current;

    if (!track || !pointer || speed === 0) {
      stackAutoScrollFrame.current = null;
      return;
    }

    const maxScrollTop = Math.max(0, track.scrollHeight - track.clientHeight);
    const previousScrollTop = track.scrollTop;
    track.scrollTop = Math.max(0, Math.min(maxScrollTop, previousScrollTop + speed));

    if (track.scrollTop !== previousScrollTop) {
      if (clipDragging.current?.mode === 'z') {
        commitStackDrag('clip', clipDragging.current.id, pointer.clientX, pointer.clientY);
      } else if (layerDragging.current?.mode === 'z') {
        commitStackDrag('layer', layerDragging.current.id, pointer.clientX, pointer.clientY);
      }
    }

    stackAutoScrollFrame.current = requestAnimationFrame(runStackAutoScroll);
  }, [commitStackDrag]);

  const updateStackAutoScroll = useCallback((clientX: number, clientY: number) => {
    const track = trackAreaRef.current;
    const stackDragActive = clipDragging.current?.mode === 'z' || layerDragging.current?.mode === 'z';
    if (!track || !stackDragActive) {
      stopStackAutoScroll();
      return;
    }

    stackAutoScrollPointer.current = { clientX, clientY };
    const rect = track.getBoundingClientRect();
    const topDistance = clientY - rect.top;
    const bottomDistance = rect.bottom - clientY;
    const canScrollUp = track.scrollTop > 0;
    const canScrollDown = track.scrollTop < track.scrollHeight - track.clientHeight - 1;
    let nextSpeed = 0;

    if (topDistance < STACK_AUTO_SCROLL_EDGE_PX && canScrollUp) {
      const intensity = 1 - Math.max(0, topDistance) / STACK_AUTO_SCROLL_EDGE_PX;
      nextSpeed = -Math.max(2, Math.round(intensity * STACK_AUTO_SCROLL_MAX_SPEED));
    } else if (bottomDistance < STACK_AUTO_SCROLL_EDGE_PX && canScrollDown) {
      const intensity = 1 - Math.max(0, bottomDistance) / STACK_AUTO_SCROLL_EDGE_PX;
      nextSpeed = Math.max(2, Math.round(intensity * STACK_AUTO_SCROLL_MAX_SPEED));
    }

    stackAutoScrollSpeed.current = nextSpeed;
    if (nextSpeed === 0) {
      if (stackAutoScrollFrame.current) {
        cancelAnimationFrame(stackAutoScrollFrame.current);
        stackAutoScrollFrame.current = null;
      }
      return;
    }

    if (!stackAutoScrollFrame.current) {
      stackAutoScrollFrame.current = requestAnimationFrame(runStackAutoScroll);
    }
  }, [runStackAutoScroll, stopStackAutoScroll]);

  const runTimelineAutoScroll = useCallback(() => {
    const track = trackAreaRef.current;
    const pointer = timelineAutoScrollPointer.current;
    const speed = timelineAutoScrollSpeed.current;

    if (!track || !pointer || speed === 0) {
      timelineAutoScrollFrame.current = null;
      return;
    }

    const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
    const previousScrollLeft = track.scrollLeft;
    track.scrollLeft = Math.max(0, Math.min(maxScrollLeft, previousScrollLeft + speed));

    if (track.scrollLeft !== previousScrollLeft) {
      timelineAutoScrollCommit.current?.(pointer.clientX, pointer.clientY);
    }

    timelineAutoScrollFrame.current = requestAnimationFrame(runTimelineAutoScroll);
  }, []);

  const updateTimelineAutoScroll = useCallback((clientX: number, clientY: number) => {
    const track = trackAreaRef.current;
    const isTimelineDragActive =
      dragging.current === 'playhead' ||
      (clipDragging.current !== null && clipDragging.current.mode !== 'z') ||
      (layerDragging.current !== null && layerDragging.current.mode !== 'z');

    if (!track || !isTimelineDragActive) {
      stopTimelineAutoScroll();
      return;
    }

    timelineAutoScrollPointer.current = { clientX, clientY };
    const rect = track.getBoundingClientRect();
    const leftDistance = clientX - rect.left;
    const rightDistance = rect.right - clientX;
    const canScrollLeft = track.scrollLeft > 0;
    const canScrollRight = track.scrollLeft < track.scrollWidth - track.clientWidth - 1;
    let nextSpeed = 0;

    if (leftDistance < TIMELINE_AUTO_SCROLL_EDGE_PX && canScrollLeft) {
      const intensity = 1 - Math.max(0, leftDistance) / TIMELINE_AUTO_SCROLL_EDGE_PX;
      nextSpeed = -Math.max(3, Math.round(intensity * TIMELINE_AUTO_SCROLL_MAX_SPEED));
    } else if (rightDistance < TIMELINE_AUTO_SCROLL_EDGE_PX && canScrollRight) {
      const intensity = 1 - Math.max(0, rightDistance) / TIMELINE_AUTO_SCROLL_EDGE_PX;
      nextSpeed = Math.max(3, Math.round(intensity * TIMELINE_AUTO_SCROLL_MAX_SPEED));
    }

    timelineAutoScrollSpeed.current = nextSpeed;
    if (nextSpeed === 0) {
      if (timelineAutoScrollFrame.current) {
        cancelAnimationFrame(timelineAutoScrollFrame.current);
        timelineAutoScrollFrame.current = null;
      }
      return;
    }

    if (!timelineAutoScrollFrame.current) {
      timelineAutoScrollFrame.current = requestAnimationFrame(runTimelineAutoScroll);
    }
  }, [runTimelineAutoScroll, stopTimelineAutoScroll]);

  const onPlayheadPointerDown = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    startPlayheadDrag(e.clientX);
  }, [startPlayheadDrag]);

  const onLayerPointerDown = useCallback((e: React.PointerEvent, layer: Layer, mode: LayerDragMode) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    onSelectLayer(layer.id);
    layerDragging.current = {
      id: layer.id,
      mode,
      startClientX: e.clientX,
      startScrollLeft: trackAreaRef.current?.scrollLeft ?? 0,
      originalStart: layer.startTime,
      originalEnd: layer.endTime,
    };
    if (mode === 'z') {
      const layerIndex = stackItems.findIndex((item) => item.kind === 'layer' && item.id === layer.id);
      setStackDragPreview(layerIndex === -1 ? null : {
        kind: 'layer',
        id: layer.id,
        targetIndex: layerIndex,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }
  }, [onSelectLayer, stackItems]);

  const onClipPointerDown = useCallback((e: React.PointerEvent, clip: TimelineClip, mode: ClipDragMode) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    onSelectClip(clip.id);
    clipDragging.current = {
      id: clip.id,
      mode,
      startClientX: e.clientX,
      startScrollLeft: trackAreaRef.current?.scrollLeft ?? 0,
      originalStart: clip.timelineStart,
      originalEnd: clip.timelineStart + clip.duration,
      originalSourceStart: clip.sourceStart,
      originalSourceEnd: clip.sourceEnd,
    };
    if (mode === 'z') {
      const clipIndex = stackItems.findIndex((item) => item.kind === 'clip' && item.id === clip.id);
      setStackDragPreview(clipIndex === -1 ? null : {
        kind: 'clip',
        id: clip.id,
        targetIndex: clipIndex,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }
  }, [onSelectClip, stackItems]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (clipDragging.current) {
      const drag = clipDragging.current;
      const track = trackAreaRef.current;
      if (!track) return;
      const timingRect = timelineLaneRef.current?.getBoundingClientRect() ?? track.getBoundingClientRect();
      const totalWidth = Math.max(1, timingRect.width);
      const scrollDeltaX = track.scrollLeft - drag.startScrollLeft;
      const deltaX = ((clientX - drag.startClientX + scrollDeltaX) / totalWidth) * dur;

      if (drag.mode === 'move') {
        updateTimelineAutoScroll(clientX, clientY);
        const length = drag.originalEnd - drag.originalStart;
        onMoveClip(drag.id, Math.max(0, drag.originalStart + deltaX));
      } else if (drag.mode === 'start') {
        updateTimelineAutoScroll(clientX, clientY);
        onTrimClip(drag.id, 'start', drag.originalSourceStart + deltaX);
      } else if (drag.mode === 'end') {
        updateTimelineAutoScroll(clientX, clientY);
        onTrimClip(drag.id, 'end', drag.originalSourceEnd + deltaX);
      } else if (drag.mode === 'z') {
        stopTimelineAutoScroll();
        updateStackAutoScroll(clientX, clientY);
        commitStackDrag('clip', drag.id, clientX, clientY);
      }
      return;
    }

    if (layerDragging.current) {
      const drag = layerDragging.current;
      const track = trackAreaRef.current;
      if (!track) return;
      const timingRect = timelineLaneRef.current?.getBoundingClientRect() ?? track.getBoundingClientRect();
      const totalWidth = Math.max(1, timingRect.width);
      const scrollDeltaX = track.scrollLeft - drag.startScrollLeft;
      const delta = ((clientX - drag.startClientX + scrollDeltaX) / totalWidth) * dur;
      const minLength = Math.min(0.5, Math.max(0.1, dur / 20));
      let nextStart = drag.originalStart;
      let nextEnd = drag.originalEnd;

      if (drag.mode === 'z') {
        stopTimelineAutoScroll();
        updateStackAutoScroll(clientX, clientY);
        commitStackDrag('layer', drag.id, clientX, clientY);
        return;
      }

      updateTimelineAutoScroll(clientX, clientY);
      if (drag.mode === 'move') {
        const length = drag.originalEnd - drag.originalStart;
        nextStart = Math.max(0, drag.originalStart + delta);
        nextEnd = nextStart + length;
      } else if (drag.mode === 'start') {
        nextStart = Math.max(0, Math.min(drag.originalEnd - minLength, drag.originalStart + delta));
      } else {
        nextEnd = Math.max(drag.originalStart + minLength, drag.originalEnd + delta);
      }

      onLayerTimingChange(drag.id, nextStart, nextEnd);
      return;
    }

    if (!dragging.current) return;
    updateTimelineAutoScroll(clientX, clientY);
    const t = getTimeFromX(clientX);
    if (dragging.current === 'playhead') onSeek(t);
  }, [commitStackDrag, dur, getTimeFromX, onLayerTimingChange, onMoveClip, onSeek, onTrimClip, stopTimelineAutoScroll, updateStackAutoScroll, updateTimelineAutoScroll]);

  useEffect(() => {
    timelineAutoScrollCommit.current = handlePointerMove;
  }, [handlePointerMove]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    handlePointerMove(e.clientX, e.clientY);
  }, [handlePointerMove]);

  const onPointerUp = useCallback(() => {
    stopStackAutoScroll();
    stopTimelineAutoScroll();
    activePointerId.current = null;
    dragging.current = null;
    layerDragging.current = null;
    clipDragging.current = null;
    setStackDragPreview(null);
  }, [stopStackAutoScroll, stopTimelineAutoScroll]);

  useEffect(() => {
    const handleDocumentPointerMove = (event: PointerEvent) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      handlePointerMove(event.clientX, event.clientY);
    };
    const handleDocumentPointerUp = (event: PointerEvent) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      onPointerUp();
    };

    document.addEventListener('pointermove', handleDocumentPointerMove);
    document.addEventListener('pointerup', handleDocumentPointerUp);
    document.addEventListener('pointercancel', handleDocumentPointerUp);
    return () => {
      document.removeEventListener('pointermove', handleDocumentPointerMove);
      document.removeEventListener('pointerup', handleDocumentPointerUp);
      document.removeEventListener('pointercancel', handleDocumentPointerUp);
    };
  }, [handlePointerMove, onPointerUp]);

  useEffect(() => stopStackAutoScroll, [stopStackAutoScroll]);
  useEffect(() => stopTimelineAutoScroll, [stopTimelineAutoScroll]);

  useEffect(() => {
    const track = trackAreaRef.current;
    if (!track) return;

    const measure = () => {
      setTimelineViewportWidth((previous) => (previous === track.clientWidth ? previous : track.clientWidth));
    };
    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="shrink-0 border-t border-[#3d2510] bg-[#0e0702] px-3 pb-3 pt-2 sm:px-4 sm:pt-3">
      <div
        className="relative max-h-[360px] min-h-[240px] touch-auto select-none overflow-x-auto overflow-y-auto overscroll-contain rounded-2xl bg-[#18120a] p-3 shadow-[inset_0_1px_0_rgba(255,240,166,0.04)] scrollbar-thin sm:max-h-[420px] sm:min-h-[280px]"
        ref={trackAreaRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onTimelineWheel}
      >
        <div className="sticky top-0 z-40 mb-2 flex flex-wrap items-center justify-between gap-2 bg-[#18120a] pb-2">
          <span className="text-[#5a4530] text-[9px] font-bold uppercase tracking-widest">Timeline</span>
          <div
            className="flex items-center gap-2 rounded-full border border-[#3d2510] bg-[#120a02]/95 px-2 py-1 text-[10px] text-[#9a8060] shadow-[0_8px_18px_rgba(0,0,0,0.22)]"
            title="Use Ctrl/Alt + mouse wheel on the timeline to zoom spacing"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span className="hidden font-semibold uppercase tracking-[0.18em] sm:inline">Spacing</span>
            <button
              type="button"
              onClick={() => adjustTimelineZoom(-6)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3d2510] bg-[#241508] text-sm font-black leading-none text-[#c8b88a] shadow-[inset_0_1px_0_rgba(255,240,166,0.05)] transition hover:border-[#7d5d1d] hover:bg-[#3d2510] hover:text-[#f2d40b] active:scale-95"
              aria-label="Decrease timeline spacing"
            >
              -
            </button>
            <span className="min-w-16 rounded-full border border-[#3d2510] bg-[#1a0c05] px-2 py-1 text-center font-mono font-bold text-[#f2d40b] shadow-inner">
              {timelineZoomLabel}
            </span>
            <button
              type="button"
              onClick={() => adjustTimelineZoom(6)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[#3d2510] bg-[#241508] text-sm font-black leading-none text-[#c8b88a] shadow-[inset_0_1px_0_rgba(255,240,166,0.05)] transition hover:border-[#7d5d1d] hover:bg-[#3d2510] hover:text-[#f2d40b] active:scale-95"
              aria-label="Increase timeline spacing"
            >
              +
            </button>
          </div>
        </div>

        <TimelineRows
          dur={dur}
          currentTime={currentTime}
          layers={layers}
          mediaAssets={mediaAssets}
          timelineClips={timelineClips}
          canvasObjects={canvasObjects}
          selectedClipId={selectedClipId}
          selectedLayerId={selectedLayerId}
          timelineWidth={timelineWidth}
          timelineLaneRef={timelineLaneRef}
          timeToPercent={timeToPercent}
          onPlayheadPointerDown={onPlayheadPointerDown}
          onTimelinePointerDown={onPlayheadPointerDown}
          onLayerPointerDown={onLayerPointerDown}
          onClipPointerDown={onClipPointerDown}
          onSelectClip={onSelectClip}
          onSelectLayer={onSelectLayer}
          onSplitClip={onSplitClip}
          onToggleClipMute={onToggleClipMute}
          onDeleteClip={onDeleteClip}
          onDeleteLayer={onDeleteLayer}
          onSplitLayer={onSplitLayer}
          onToggleLayerMute={onToggleLayerMute}
          stackDragPreview={stackDragPreview}
        />
      </div>
    </div>
  );
}
