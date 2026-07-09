'use client';

import { useCallback, useRef } from 'react';
import { SkipBack, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { formatTime } from './videoCanvas';

interface VideoPlaybackControlsProps {
  playbackRate: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  audioMuted: boolean;
  isPlaying: boolean;
  onReset: () => void;
  onToggleMute: () => void;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (rate: number) => void;
}

export default function VideoPlaybackControls({
  playbackRate,
  currentTime,
  trimStart,
  trimEnd,
  audioMuted,
  isPlaying,
  onReset,
  onToggleMute,
  onPlayPause,
  onSeek,
  onSpeedChange,
}: VideoPlaybackControlsProps) {
  const scrubberTrackRef = useRef<HTMLDivElement>(null);
  const trimmedTime = Math.max(0, currentTime - trimStart);
  const trimmedDuration = Math.max(0, trimEnd - trimStart);
  const scrubberProgress = trimmedDuration > 0 ? Math.max(0, Math.min(1, trimmedTime / trimmedDuration)) : 0;

  const seekFromClientX = useCallback((clientX: number) => {
    const track = scrubberTrackRef.current;
    if (!track || trimmedDuration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(rect.width, 1)));
    onSeek(trimStart + ratio * trimmedDuration);
  }, [onSeek, trimStart, trimmedDuration]);

  function handleScrubberPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  }

  function handleScrubberPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    seekFromClientX(e.clientX);
  }

  function handleScrubberPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-t border-[#3d2510]/60 px-1 pt-2 pb-[env(safe-area-inset-bottom)] sm:gap-3">
      <div
        className="relative order-first h-8 basis-full cursor-ew-resize touch-none py-3"
        onPointerDown={handleScrubberPointerDown}
        onPointerMove={handleScrubberPointerMove}
        onPointerUp={handleScrubberPointerUp}
        onPointerCancel={handleScrubberPointerUp}
        title="Drag to seek"
      >
        <div ref={scrubberTrackRef} className="h-2 rounded-full bg-[#2d1a08]">
          <div
            className="relative h-full rounded-full bg-[#c9b600]"
            style={{ width: `${scrubberProgress * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-[#1a0c05] bg-[#c9b600] shadow-[0_0_12px_rgba(201,182,0,0.35)]" />
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-[#7a6040] transition-colors hover:bg-[#2d1a08] hover:text-[#c9b600]"
      >
        <SkipBack size={15} />
      </button>
      <button
        type="button"
        onClick={onToggleMute}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#3d2510] text-[#7a6040] transition-colors hover:border-[#5a4530] hover:text-[#c9b600]"
        title={audioMuted ? 'Unmute' : 'Mute'}
      >
        {audioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c9b600] text-[#1a0c05] transition-colors hover:bg-[#e0cc00]"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <select
        value={playbackRate}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="min-h-11 rounded-lg border border-[#3d2510] bg-[#1f1005] px-2 py-1 text-[11px] text-[#d7c58a] outline-none"
        title="Playback speed"
      >
        <option value={0.5}>0.5x</option>
        <option value={0.75}>0.75x</option>
        <option value={1}>1x</option>
        <option value={1.25}>1.25x</option>
        <option value={1.5}>1.5x</option>
        <option value={2}>2x</option>
      </select>
      <span className="text-[#7a6040] text-xs font-mono">
        {formatTime(trimmedTime)} / {formatTime(trimmedDuration)}
      </span>
    </div>
  );
}
