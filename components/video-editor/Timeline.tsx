'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Volume2, VolumeX, Trash2 } from 'lucide-react';
import { SubtitleChunk, SplitPoint } from '@/types/editor';

interface TimelineProps {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  splitPoints: SplitPoint[];
  subtitles: SubtitleChunk[];
  hasAudio: boolean;
  audioMuted: boolean;
  waveformData: Float32Array | null;
  onSeek: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
  onSplit: () => void;
  onAudioMuteToggle: () => void;
  onAudioRemove: () => void;
}

type DragTarget = 'playhead' | 'trim-start' | 'trim-end' | null;

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
  splitPoints,
  subtitles,
  hasAudio,
  audioMuted,
  waveformData,
  onSeek,
  onTrimChange,
  onSplit,
  onAudioMuteToggle,
  onAudioRemove,
}: TimelineProps) {
  const trackAreaRef = useRef<HTMLDivElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<DragTarget>(null);

  const dur = duration || 1;

  const timeToPercent = useCallback((t: number) => `${(t / dur) * 100}%`, [dur]);

  const getTimeFromX = useCallback((clientX: number): number => {
    const rect = trackAreaRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(dur, ((clientX - rect.left) / rect.width) * dur));
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

  function onMouseMove(e: React.MouseEvent) {
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
        className="relative select-none"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseDown={(e) => onMouseDown(e, 'playhead')}
      >
        {/* Time ruler */}
        <div className="relative h-5 mb-1.5">
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
        <TrackRow label="Video">
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

            {/* Split markers */}
            {splitPoints.map((sp) => (
              <div
                key={sp.id}
                className="absolute inset-y-0 w-0.5 bg-[#ff6b20] z-20"
                style={{ left: timeToPercent(sp.time) }}
                title={formatTick(sp.time)}
              />
            ))}

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
        <TrackRow label="Subs">
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
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TrackRow({
  label,
  children,
  controls,
}: {
  label: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-9 text-[9px] text-[#4a3510] font-bold uppercase shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-7 relative">{children}</div>
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
