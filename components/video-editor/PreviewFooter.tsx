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
    <div className="px-4 py-3 flex flex-col gap-2 shrink-0">
      <div
        ref={seekBarRef}
        className="h-4 touch-none cursor-pointer py-1.5"
        onPointerDown={handleSeekPointerDown}
        onPointerMove={handleSeekPointerMove}
        onPointerUp={handleSeekPointerUp}
        onPointerCancel={handleSeekPointerUp}
      >
        <div className="h-1.5 rounded-full bg-[#2d1a08]">
        <div
          className="h-full bg-[#c9b600] rounded-full relative transition-all"
          style={{ width: `${progress * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#c9b600] rounded-full border-2 border-[#1a0c05]" />
        </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-[#c9b600] text-[#1a0c05] flex items-center justify-center hover:bg-[#e0cc00] transition-colors shrink-0"
        >
          {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>

        <span className="text-[#7a6040] text-xs font-mono">
          {formatTime(currentTime)} / {formatTime(startAt + totalDuration)}
        </span>

        <div className="flex-1" />
        <button onClick={onToggleMute} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7a6040] hover:text-[#c8b88a] hover:bg-[#2d1a08] transition-colors">
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <div className="flex items-center gap-2 text-[#5a4530] text-[10px]">
          <button onClick={onExportSrt} className="hover:text-[#c9b600] underline">
            SRT
          </button>
          <span>|</span>
          <button onClick={onExportVtt} className="hover:text-[#c9b600] underline">
            VTT
          </button>
        </div>
      </div>
    </div>
  );
}
