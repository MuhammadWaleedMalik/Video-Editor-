'use client';

import { useCallback, useRef } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from './videoCanvas';

interface PreviewFooterProps {
  progress: number;
  currentTime: number;
  totalDuration: number;
  startAt: number;
  playing: boolean;
  muted: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
  onExportSrt: () => void;
  onExportVtt: () => void;
}

export default function PreviewFooter({
  progress,
  currentTime,
  totalDuration,
  startAt,
  playing,
  muted,
  onTogglePlay,
  onSeek,
  onToggleMute,
  onExportSrt,
  onExportVtt,
}: PreviewFooterProps) {
  const seekBarRef = useRef<HTMLDivElement>(null);

  const seekFromClientX = useCallback((clientX: number) => {
    const seekBar = seekBarRef.current;
    if (!seekBar) return;
    const bar = seekBar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - bar.left) / Math.max(bar.width, 1)));
    onSeek(startAt + ratio * Math.max(totalDuration, 0.001));
  }, [onSeek, startAt, totalDuration]);

  function handleSeekPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
  }

  function handleSeekPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    seekFromClientX(e.clientX);
  }

  function handleSeekPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4">
      <div
        ref={seekBarRef}
        className="h-8 touch-none cursor-pointer py-3"
        onPointerDown={handleSeekPointerDown}
        onPointerMove={handleSeekPointerMove}
        onPointerUp={handleSeekPointerUp}
        onPointerCancel={handleSeekPointerUp}
      >
        <div className="h-2 rounded-full bg-[#2d1a08]">
        <div
          className="relative h-full rounded-full bg-[#c9b600] transition-all"
          style={{ width: `${progress * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-[#1a0c05] bg-[#c9b600]" />
        </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#c9b600] text-[#1a0c05] transition-colors hover:bg-[#e0cc00]"
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        <span className="text-[#7a6040] text-xs font-mono">
          {formatTime(currentTime)} / {formatTime(startAt + totalDuration)}
        </span>

        <div className="min-w-2 flex-1" />
        <button type="button" onClick={onToggleMute} className="flex h-11 w-11 items-center justify-center rounded-lg text-[#7a6040] transition-colors hover:bg-[#2d1a08] hover:text-[#c8b88a]">
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <div className="flex items-center gap-2 text-[#5a4530] text-[10px]">
          <button type="button" onClick={onExportSrt} className="min-h-11 px-1 underline hover:text-[#c9b600]">
            SRT
          </button>
          <span>|</span>
          <button type="button" onClick={onExportVtt} className="min-h-11 px-1 underline hover:text-[#c9b600]">
            VTT
          </button>
        </div>
      </div>
    </div>
  );
}
