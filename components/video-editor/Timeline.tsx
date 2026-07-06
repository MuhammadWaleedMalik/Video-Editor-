'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Layer, SubtitleChunk } from '@/types/editor';
import { drawWaveform } from './timelineUtils';
import TimelineRows from './TimelineRows';

interface TimelineProps {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  subtitles: SubtitleChunk[];
  layers: Layer[];
  selectedLayerId: string | null;
  hasAudio: boolean;
  audioMuted: boolean;
  waveformData: Float32Array | null;
  onSeek: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
  onAudioMuteToggle: () => void;
  onAudioRemove: () => void;
  onSelectLayer: (id: string | null) => void;
  onLayerTimingChange: (id: string, startTime: number, endTime: number) => void;
  onLayerOrderChange: (id: string, direction: 'front' | 'back') => void;
}

type DragTarget = 'playhead' | 'trim-start' | 'trim-end' | null;
type LayerDragMode = 'move' | 'start' | 'end';
type LayerDragState = {
  id: string;
  mode: LayerDragMode;
  startClientX: number;
  originalStart: number;
  originalEnd: number;
};

export default function Timeline({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  subtitles,
  layers,
  selectedLayerId,
  hasAudio,
  audioMuted,
  waveformData,
  onSeek,
  onTrimChange,
  onAudioMuteToggle,
  onAudioRemove,
  onSelectLayer,
  onLayerTimingChange,
  onLayerOrderChange,
}: TimelineProps) {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<DragTarget>(null);
  const layerDragging = useRef<LayerDragState | null>(null);

  const dur = duration || 1;
  const timelineWidth = Math.min(2400, Math.max(300, Math.round(dur * 24)));
  const timeToPercent = useCallback((t: number) => `${(t / dur) * 100}%`, [dur]);

  const getTimeFromX = useCallback((clientX: number): number => {
    const track = trackAreaRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const scrollX = clientX - rect.left + track.scrollLeft;
    return Math.max(0, Math.min(dur, (scrollX / Math.max(1, track.scrollWidth)) * dur));
  }, [dur]);

  useEffect(() => {
    const canvas = audioCanvasRef.current;
    if (!canvas || !waveformData) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    drawWaveform(canvas, waveformData, currentTime, dur, audioMuted);
  }, [waveformData, currentTime, dur, audioMuted]);

  const onMouseDown = (e: React.MouseEvent, target: 'playhead' | 'trim-start' | 'trim-end') => {
    e.preventDefault();
    dragging.current = target;
    if (target === 'playhead') onSeek(getTimeFromX(e.clientX));
  };

  const onLayerMouseDown = (e: React.MouseEvent, layer: Layer, mode: LayerDragMode) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectLayer(layer.id);
    layerDragging.current = {
      id: layer.id,
      mode,
      startClientX: e.clientX,
      originalStart: layer.startTime,
      originalEnd: layer.endTime,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (layerDragging.current) {
      const drag = layerDragging.current;
      const track = trackAreaRef.current;
      if (!track) return;
      const totalWidth = Math.max(1, track.scrollWidth);
      const delta = ((e.clientX - drag.startClientX) / totalWidth) * dur;
      const minLength = Math.min(0.5, Math.max(0.1, dur / 20));
      let nextStart = drag.originalStart;
      let nextEnd = drag.originalEnd;

      if (drag.mode === 'move') {
        const length = drag.originalEnd - drag.originalStart;
        nextStart = Math.max(0, Math.min(dur - length, drag.originalStart + delta));
        nextEnd = nextStart + length;
      } else if (drag.mode === 'start') {
        nextStart = Math.max(0, Math.min(drag.originalEnd - minLength, drag.originalStart + delta));
      } else {
        nextEnd = Math.min(dur, Math.max(drag.originalStart + minLength, drag.originalEnd + delta));
      }

      onLayerTimingChange(drag.id, nextStart, nextEnd);
      return;
    }

    if (!dragging.current) return;
    const t = getTimeFromX(e.clientX);
    if (dragging.current === 'playhead') onSeek(t);
    else if (dragging.current === 'trim-start') onTrimChange(Math.min(t, trimEnd - 0.5), trimEnd);
    else onTrimChange(trimStart, Math.max(t, trimStart + 0.5));
  };

  const onMouseUp = () => {
    dragging.current = null;
    layerDragging.current = null;
  };

  return (
    <div className="bg-[#0e0702] border-t border-[#3d2510] px-3 sm:px-4 pt-2 sm:pt-3 pb-3 shrink-0">
      <div
        className="relative select-none overflow-x-auto scrollbar-thin touch-pan-x"
        ref={trackAreaRef}
        onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onMouseDown={(e) => onMouseDown(e, 'playhead')}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#5a4530] text-[9px] font-bold uppercase tracking-widest">Timeline</span>
        </div>

        <TimelineRows
          dur={dur}
          currentTime={currentTime}
          trimStart={trimStart}
          trimEnd={trimEnd}
          subtitles={subtitles}
          layers={layers}
          hasAudio={hasAudio}
          audioMuted={audioMuted}
          timelineWidth={timelineWidth}
          timeToPercent={timeToPercent}
          onMouseDown={onMouseDown}
          onLayerMouseDown={onLayerMouseDown}
          selectedLayerId={selectedLayerId}
          onAudioMuteToggle={onAudioMuteToggle}
          onAudioRemove={onAudioRemove}
          onLayerOrderChange={onLayerOrderChange}
          audioTrackContent={
            waveformData ? (
              <canvas
                ref={audioCanvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ opacity: audioMuted ? 0.3 : 1, transition: 'opacity 0.2s' }}
              />
            ) : hasAudio ? (
              <div className={`absolute inset-1 rounded bg-[#6b7020] ${audioMuted ? 'opacity-25' : 'opacity-70'}`} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#3d2510] text-[9px]">No audio track</span>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
