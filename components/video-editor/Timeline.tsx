'use client';

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { CanvasObject, Layer, MediaAsset, TimelineClip } from '@/types/editor';
import { getTimelineStackItems } from './timelineModel';
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
  onLayerStackOrderChange: (id: string, targetIndex: number) => void;
  mediaAssets: MediaAsset[];
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedClipId: string | null;
  onSelectClip: (id: string | null) => void;
  onMoveClip: (id: string, timelineStart: number) => void;
  onTrimClip: (id: string, edge: 'start' | 'end', sourceTime: number) => void;
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
  originalStart: number;
  originalEnd: number;
};
type ClipDragState = {
  id: string;
  mode: ClipDragMode;
  startClientX: number;
  originalStart: number;
  originalEnd: number;
  originalSourceStart: number;
  originalSourceEnd: number;
};
type StackDragPreview =
  | { kind: 'clip'; id: string; targetIndex: number }
  | { kind: 'layer'; id: string; targetIndex: number }
  | null;

export default function Timeline({
  duration,
  currentTime,
  layers,
  selectedLayerId,
  onSeek,
  onSelectLayer,
  onDeleteLayer,
  onLayerTimingChange,
  onLayerStackOrderChange,
  mediaAssets,
  timelineClips,
  canvasObjects,
  selectedClipId,
  onSelectClip,
  onMoveClip,
  onTrimClip,
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
  const [stackDragPreview, setStackDragPreview] = useState<StackDragPreview>(null);

  const dur = duration > 0 ? duration : 1;
  const timelineWidth = 0;
  const stackItems = useMemo(
    () => getTimelineStackItems(layers, timelineClips, canvasObjects),
    [canvasObjects, layers, timelineClips]
  );
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

  const onPointerDown = useCallback((e: React.PointerEvent, target: 'playhead') => {
    if (!e.isPrimary) return;
    e.preventDefault();
    activePointerId.current = e.pointerId;
    if (target === 'playhead') startPlayheadDrag(e.clientX);
  }, [startPlayheadDrag]);

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
      originalStart: layer.startTime,
      originalEnd: layer.endTime,
    };
    if (mode === 'z') {
      const layerIndex = stackItems.findIndex((item) => item.kind === 'layer' && item.id === layer.id);
      setStackDragPreview(layerIndex === -1 ? null : { kind: 'layer', id: layer.id, targetIndex: layerIndex });
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
      originalStart: clip.timelineStart,
      originalEnd: clip.timelineStart + clip.duration,
      originalSourceStart: clip.sourceStart,
      originalSourceEnd: clip.sourceEnd,
    };
    if (mode === 'z') {
      const clipIndex = stackItems.findIndex((item) => item.kind === 'clip' && item.id === clip.id);
      setStackDragPreview(clipIndex === -1 ? null : { kind: 'clip', id: clip.id, targetIndex: clipIndex });
    }
  }, [onSelectClip, stackItems]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (clipDragging.current) {
      const drag = clipDragging.current;
      const track = trackAreaRef.current;
      if (!track) return;
      const timingRect = timelineLaneRef.current?.getBoundingClientRect() ?? track.getBoundingClientRect();
      const totalWidth = Math.max(1, timingRect.width);
      const deltaX = ((clientX - drag.startClientX) / totalWidth) * dur;

      if (drag.mode === 'move') {
        const length = drag.originalEnd - drag.originalStart;
        onMoveClip(drag.id, Math.max(0, drag.originalStart + deltaX));
      } else if (drag.mode === 'start') {
        onTrimClip(drag.id, 'start', drag.originalSourceStart + deltaX);
      } else if (drag.mode === 'end') {
        onTrimClip(drag.id, 'end', drag.originalSourceEnd + deltaX);
      } else if (drag.mode === 'z') {
        const clipIndex = stackItems.findIndex((item) => item.kind === 'clip' && item.id === drag.id);
        if (clipIndex === -1) return;
        const rowTop = 10;
        const rowHeight = 118;
        const rect = track.getBoundingClientRect();
        const row = Math.floor((clientY - rect.top + track.scrollTop - rowTop) / rowHeight);
        const targetIndex = Math.max(0, Math.min(stackItems.length - 1, row));
        setStackDragPreview({ kind: 'clip', id: drag.id, targetIndex });
        if (targetIndex !== clipIndex) {
          onClipOrderChange(drag.id, targetIndex);
        }
      }
      return;
    }

    if (layerDragging.current) {
      const drag = layerDragging.current;
      const track = trackAreaRef.current;
      if (!track) return;
      const timingRect = timelineLaneRef.current?.getBoundingClientRect() ?? track.getBoundingClientRect();
      const totalWidth = Math.max(1, timingRect.width);
      const delta = ((clientX - drag.startClientX) / totalWidth) * dur;
      const minLength = Math.min(0.5, Math.max(0.1, dur / 20));
      let nextStart = drag.originalStart;
      let nextEnd = drag.originalEnd;

      if (drag.mode === 'z') {
        const layerIndex = stackItems.findIndex((item) => item.kind === 'layer' && item.id === drag.id);
        if (layerIndex === -1) return;
        const rowTop = 10;
        const rowHeight = 118;
        const rect = track.getBoundingClientRect();
        const row = Math.floor((clientY - rect.top + track.scrollTop - rowTop) / rowHeight);
        const targetIndex = Math.max(0, Math.min(stackItems.length - 1, row));
        setStackDragPreview({ kind: 'layer', id: drag.id, targetIndex });
        if (targetIndex !== layerIndex) {
          onLayerStackOrderChange(drag.id, targetIndex);
        }
        return;
      }

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
    const t = getTimeFromX(clientX);
    if (dragging.current === 'playhead') onSeek(t);
  }, [dur, getTimeFromX, onClipOrderChange, onLayerStackOrderChange, onLayerTimingChange, onMoveClip, onSeek, onTrimClip, stackItems]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;
    handlePointerMove(e.clientX, e.clientY);
  }, [handlePointerMove]);

  const onPointerUp = useCallback(() => {
    activePointerId.current = null;
    dragging.current = null;
    layerDragging.current = null;
    clipDragging.current = null;
    setStackDragPreview(null);
  }, []);

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

  return (
    <div className="bg-[#0e0702] border-t border-[#3d2510] px-2 sm:px-3 pt-1.5 sm:pt-2 pb-2 shrink-0">
      <div
        className="relative max-h-[240px] min-h-[168px] touch-pan-y select-none overflow-y-auto overflow-x-hidden rounded border border-[#423112] bg-[#18120a] p-2 scrollbar-thin sm:max-h-[280px] sm:min-h-[180px]"
        ref={trackAreaRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerDown={(e) => onPointerDown(e, 'playhead')}
      >
        <div className="sticky top-0 z-40 mb-2 flex items-center justify-between bg-[#18120a] pb-2">
          <span className="text-[#5a4530] text-[9px] font-bold uppercase tracking-widest">Timeline</span>
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
          onLayerPointerDown={onLayerPointerDown}
          onClipPointerDown={onClipPointerDown}
          onSelectClip={onSelectClip}
          onSelectLayer={onSelectLayer}
          onToggleClipMute={onToggleClipMute}
          onDeleteClip={onDeleteClip}
          onDeleteLayer={onDeleteLayer}
          stackDragPreview={stackDragPreview}
        />
      </div>
    </div>
  );
}
