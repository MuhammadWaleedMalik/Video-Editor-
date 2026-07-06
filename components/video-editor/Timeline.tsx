'use client';

import { useRef, useCallback, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Trash2,
  Image as ImageIcon,
  Film,
  Type,
  Music,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Layer, SubtitleChunk } from '@/types/editor';

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
  onLayerZIndexChange: (id: string, zIndex: number) => void;
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

function formatTick(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Draw waveform onto canvas
function drawWaveform(
  canvas: HTMLCanvasElement,
  waveform: Float32Array,
  currentTime: number,
  duration: number,
  muted: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const centerY = height / 2;
  const barCount = Math.min(waveform.length, width);
  const barW = width / barCount;

  const playedRatio = duration > 0 ? currentTime / duration : 0;
  const playedX = playedRatio * width;

  for (let i = 0; i < barCount; i++) {
    const idx = Math.floor((i / barCount) * waveform.length);
    const amp = waveform[idx];
    const bh = Math.max(2, amp * height * 0.88);
    const x = i * barW;
    const played = x <= playedX;

    ctx.fillStyle = muted
      ? 'rgba(107,112,32,0.25)'
      : played
      ? 'rgba(107,112,32,0.95)'
      : 'rgba(107,112,32,0.45)';

    ctx.fillRect(x, centerY - bh / 2, Math.max(1, barW - 0.8), bh);
  }

  // Playhead line
  if (playedX > 0) {
    ctx.fillStyle = '#c9b600';
    ctx.fillRect(playedX - 0.5, 0, 1, height);
  }
}

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
  onLayerZIndexChange,
}: TimelineProps) {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<DragTarget>(null);
  const layerDragging = useRef<LayerDragState | null>(null);

  const dur = duration || 1;
  const timelineWidth = Math.min(2400, Math.max(780, Math.round(dur * 28)));

  const timeToPercent = useCallback((t: number) => `${(t / dur) * 100}%`, [dur]);

  const getTimeFromX = useCallback((clientX: number): number => {
    const track = trackAreaRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const scrollX = clientX - rect.left + track.scrollLeft;
    const scrollWidth = Math.max(1, track.scrollWidth);
    return Math.max(0, Math.min(dur, (scrollX / scrollWidth) * dur));
  }, [dur]);

  // Redraw audio canvas whenever waveform/time/muted changes
  useEffect(() => {
    const canvas = audioCanvasRef.current;
    if (!canvas || !waveformData) return;
    // Match canvas pixel size to element size
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    drawWaveform(canvas, waveformData, currentTime, dur, audioMuted);
  }, [waveformData, currentTime, dur, audioMuted]);

  function onMouseDown(e: React.MouseEvent, target: DragTarget) {
    e.preventDefault();
    dragging.current = target;
    if (target === 'playhead') onSeek(getTimeFromX(e.clientX));
  }

  function onLayerMouseDown(e: React.MouseEvent, layer: Layer, mode: LayerDragMode) {
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
  }

  function updateLayerDrag(e: React.MouseEvent) {
    const drag = layerDragging.current;
    const track = trackAreaRef.current;
    if (!drag || !track) return;
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
  }

  function onMouseMove(e: React.MouseEvent) {
    if (layerDragging.current) {
      updateLayerDrag(e);
      return;
    }

    if (!dragging.current) return;
    const t = getTimeFromX(e.clientX);
    if (dragging.current === 'playhead') onSeek(t);
    else if (dragging.current === 'trim-start')
      onTrimChange(Math.min(t, trimEnd - 0.5), trimEnd);
    else if (dragging.current === 'trim-end')
      onTrimChange(trimStart, Math.max(t, trimStart + 0.5));
  }

  function onMouseUp() {
    dragging.current = null;
    layerDragging.current = null;
  }

  const ticks = Array.from({ length: 11 }, (_, i) => (dur / 10) * i);

  return (
    <div className="bg-[#0e0702] border-t border-[#3d2510] px-4 pt-3 pb-4 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#5a4530] text-[9px] font-bold uppercase tracking-widest">Timeline</span>
      </div>

      {/* Track area */}
      <div
        ref={trackAreaRef}
        className="relative select-none overflow-x-auto scrollbar-thin"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseDown={(e) => onMouseDown(e, 'playhead')}
      >
        {/* Time ruler */}
        <div className="relative h-5 mb-1.5" style={{ minWidth: `${timelineWidth}px` }}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute text-[#4a3510] text-[9px] font-mono -translate-x-1/2"
              style={{ left: timeToPercent(tick) }}
            >
              {formatTick(tick)}
            </span>
          ))}
        </div>

        {/* ── VIDEO track ── */}
        <TrackRow label="Video" contentWidth={timelineWidth}>
          <div className="relative w-full h-full bg-[#1a0f04] rounded overflow-visible">
            {/* Full bar */}
            <div className="absolute inset-0 bg-[#8b8c20] rounded opacity-70" />

            {/* Dim outside trim */}
            <div
              className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-l z-10"
              style={{ left: 0, width: timeToPercent(trimStart) }}
            />
            <div
              className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-r z-10"
              style={{ left: timeToPercent(trimEnd), right: 0 }}
            />

            {/* Trim handles */}
            {(trimStart > 0 || trimEnd < dur) && (
              <div
                className="absolute inset-y-0 w-2.5 bg-[#c9b600] rounded-l cursor-ew-resize z-30 flex items-center justify-center hover:bg-[#e0cc00] transition-colors"
                style={{ left: timeToPercent(trimStart) }}
                onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'trim-start'); }}
              >
                <div className="w-px h-3 bg-[#1a0c05]" />
              </div>
            )}
            {(trimEnd < dur) && (
              <div
                className="absolute inset-y-0 w-2.5 bg-[#c9b600] rounded-r cursor-ew-resize z-30 flex items-center justify-center hover:bg-[#e0cc00] transition-colors -translate-x-full"
                style={{ left: timeToPercent(trimEnd) }}
                onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'trim-end'); }}
              >
                <div className="w-px h-3 bg-[#1a0c05]" />
              </div>
            )}

            {/* Playhead */}
            <Playhead left={timeToPercent(currentTime)} />
          </div>
        </TrackRow>

        {/* ── AUDIO track ── */}
        <TrackRow
          label="Audio"
          contentWidth={timelineWidth}
          controls={
            hasAudio ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onAudioMuteToggle(); }}
                  title={audioMuted ? 'Unmute' : 'Mute'}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    audioMuted
                      ? 'bg-[#c9b600] text-[#1a0c05]'
                      : 'bg-[#2d1a08] text-[#9a8060] hover:text-[#c9b600]'
                  }`}
                >
                  {audioMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onAudioRemove(); }}
                  title="Remove audio"
                  className="w-6 h-6 flex items-center justify-center rounded bg-[#2d1a08] text-[#7a4040] hover:text-[#e05050] transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ) : null
          }
        >
          <div className="relative w-full h-full bg-[#1a0f04] rounded overflow-hidden">
            {hasAudio && waveformData ? (
              <canvas
                ref={audioCanvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ opacity: audioMuted ? 0.3 : 1, transition: 'opacity 0.2s' }}
              />
            ) : hasAudio ? (
              /* Fallback bar while waveform loads */
              <div className={`absolute inset-1 rounded bg-[#6b7020] transition-opacity ${audioMuted ? 'opacity-25' : 'opacity-70'}`} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#3d2510] text-[9px]">No audio track</span>
              </div>
            )}
            <Playhead left={timeToPercent(currentTime)} />
          </div>
        </TrackRow>

        {/* ── SUBS track ── */}
        <TrackRow label="Subs" contentWidth={timelineWidth}>
          <div className="relative w-full h-full bg-[#1a0f04] rounded overflow-hidden">
            {subtitles.map((chunk) => {
              const left = `${(chunk.startTime / dur) * 100}%`;
              const width = `${((chunk.endTime - chunk.startTime) / dur) * 100}%`;
              const isActive = currentTime >= chunk.startTime && currentTime <= chunk.endTime;
              return (
                <div
                  key={chunk.id}
                  className={`absolute inset-y-1 rounded cursor-pointer transition-colors ${
                    isActive ? 'bg-[#c9b600]' : 'bg-[#8b8c20] hover:bg-[#a0a030]'
                  }`}
                  style={{ left, width: `max(4px, ${width})` }}
                  title={chunk.text}
                />
              );
            })}
            <Playhead left={timeToPercent(currentTime)} />
          </div>
        </TrackRow>

        {/* Layer clips */}
        <div className="flex items-start gap-2 mt-2">
          <span className="w-9 pt-2 text-[9px] text-[#4a3510] font-bold uppercase shrink-0 text-right">
            Layers
          </span>
          <div
            className="flex-1 max-h-[120px] overflow-auto pr-1 scrollbar-thin"
            style={{ minWidth: `${timelineWidth}px` }}
          >
            {layers.length === 0 ? (
              <div className="h-7 rounded bg-[#1a0f04] border border-dashed border-[#3d2510] flex items-center justify-center">
                <span className="text-[#3d2510] text-[9px]">Add a layer to place it on the timeline</span>
              </div>
            ) : (
              (() => {
                const maxZ = layers.reduce((acc, item) => Math.max(acc, item.zIndex), 1);
                return [...layers]
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((layer) => {
                    const left = `${(layer.startTime / dur) * 100}%`;
                    const width = `${Math.max(0.5, ((layer.endTime - layer.startTime) / dur) * 100)}%`;
                    const selected = selectedLayerId === layer.id;
                    const Icon =
                      layer.type === 'image'
                        ? ImageIcon
                        : layer.type === 'video'
                          ? Film
                          : layer.type === 'audio'
                            ? Music
                            : Type;

                    return (
                      <div key={layer.id} className="relative h-8 mb-1 rounded bg-[#1a0f04] overflow-hidden">
                        <Playhead left={timeToPercent(currentTime)} />
                        <div
                          className={`absolute inset-y-1 rounded border cursor-grab active:cursor-grabbing transition-colors ${
                            selected
                              ? 'bg-[#c9b600] border-[#f0dd2a] text-[#1a0c05]'
                              : 'bg-[#3b360d] border-[#7b7d20] text-[#e8d5a0] hover:border-[#c9b600]'
                          }`}
                          style={{ left, width: `max(28px, ${width})` }}
                          title={`${layer.name} ${formatTick(layer.startTime)} - ${formatTick(layer.endTime)}`}
                          onMouseDown={(e) => onLayerMouseDown(e, layer, 'move')}
                        >
                          <div
                            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/35"
                            onMouseDown={(e) => onLayerMouseDown(e, layer, 'start')}
                          />
                          <div className="flex h-full items-center gap-1.5 px-2 min-w-0">
                            <Icon size={11} className="shrink-0" />
                            <span className="text-[10px] font-semibold truncate">{layer.name}</span>
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/35"
                            onMouseDown={(e) => onLayerMouseDown(e, layer, 'end')}
                          />
                        </div>

                        <div className="absolute right-6 top-0.5 h-full flex items-center gap-1 px-1">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerZIndexChange(layer.id, Math.min(maxZ + 1, layer.zIndex + 1));
                          }}
                            className="w-4 h-4 rounded bg-[#2d1a08] border border-[#7b7d20] text-[#9a8060] hover:text-[#c9b600] hover:border-[#c9b600] flex items-center justify-center"
                          >
                            <ArrowUp size={9} />
                          </button>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onLayerZIndexChange(layer.id, Math.max(1, layer.zIndex - 1));
                          }}
                            className="w-4 h-4 rounded bg-[#2d1a08] border border-[#7b7d20] text-[#9a8060] hover:text-[#c9b600] hover:border-[#c9b600] flex items-center justify-center"
                          >
                            <ArrowDown size={9} />
                          </button>
                        </div>
                      </div>
                    );
                  });
              })()
            )}
          </div>
          <div className="w-[52px] shrink-0" />
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TrackRow({
  label,
  children,
  controls,
  contentWidth,
}: {
  label: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
  contentWidth?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-9 text-[9px] text-[#4a3510] font-bold uppercase shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-7 relative" style={{ minWidth: `${contentWidth || 0}px` }}>
        {children}
      </div>
      {controls && <div className="shrink-0">{controls}</div>}
      {!controls && <div className="w-[52px] shrink-0" />}
    </div>
  );
}

function Playhead({ left }: { left: string }) {
  return (
    <div
      className="absolute inset-y-0 w-px bg-[#c9b600] z-40 pointer-events-none"
      style={{ left }}
    >
      <div className="w-2 h-2 bg-[#c9b600] rounded-full -translate-x-[3px]" />
    </div>
  );
}
