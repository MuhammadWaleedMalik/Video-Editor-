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
  onSpeedChange,
}: VideoPlaybackControlsProps) {
  const trimmedTime = Math.max(0, currentTime - trimStart);
  const trimmedDuration = Math.max(0, trimEnd - trimStart);

  return (
    <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-2 border-t border-[#3d2510]/60 px-1 pt-2 sm:gap-3">
      <button
        onClick={onReset}
        className="text-[#7a6040] hover:text-[#c9b600] transition-colors"
      >
        <SkipBack size={15} />
      </button>
      <button
        onClick={onToggleMute}
        className="w-8 h-8 rounded-full border border-[#3d2510] text-[#7a6040] flex items-center justify-center hover:text-[#c9b600] hover:border-[#5a4530] transition-colors"
        title={audioMuted ? 'Unmute' : 'Mute'}
      >
        {audioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <button
        onClick={onPlayPause}
        className="w-8 h-8 rounded-full bg-[#c9b600] text-[#1a0c05] flex items-center justify-center hover:bg-[#e0cc00] transition-colors shrink-0"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <select
        value={playbackRate}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="bg-[#1f1005] border border-[#3d2510] text-[#d7c58a] text-[11px] rounded-lg px-2 py-1 outline-none"
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
