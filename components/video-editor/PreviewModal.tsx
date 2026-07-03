'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { VideoFormat, SubtitleChunk, Layer } from '@/types/editor';

const FORMAT_RATIO: Record<VideoFormat, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
};

interface PreviewModalProps {
  videoUrl: string;
  format: VideoFormat;
  subtitles: SubtitleChunk[];
  trimStart: number;
  trimEnd: number;
  onClose: () => void;
  layers?: Layer[];
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function PreviewModal({
  videoUrl,
  format,
  subtitles,
  trimStart,
  trimEnd,
  onClose,
  layers = [],
}: PreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    return (trimStart && isFinite(trimStart)) ? trimStart : 0;
  });
  const [muted, setMuted] = useState(false);
  const [activeSub, setActiveSub] = useState<SubtitleChunk | null>(null);

  const validTrimStart = (trimStart && isFinite(trimStart)) ? trimStart : 0;
  const validTrimEnd = (trimEnd && isFinite(trimEnd)) ? trimEnd : 1;
  const duration = validTrimEnd - validTrimStart || 1;

  // Start from trimStart
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Validate trimStart is a finite number
    const validStartTime = (trimStart && isFinite(trimStart)) ? trimStart : 0;
    v.currentTime = validStartTime;
  }, [trimStart]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play(); setPlaying(true); }
  }

  function onTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    if (t >= validTrimEnd) {
      v.pause();
      v.currentTime = validTrimStart;
      setPlaying(false);
      setCurrentTime(validTrimStart);
      return;
    }
    setCurrentTime(t);
    setActiveSub(subtitles.find((c) => t >= c.startTime && t <= c.endTime) ?? null);
  }

  function seekTo(e: React.MouseEvent<HTMLDivElement>) {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const validStartTime = (trimStart && isFinite(trimStart)) ? trimStart : 0;
    const t = validStartTime + ratio * duration;
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  }

  const progressRatio = duration > 0 ? (currentTime - trimStart) / duration : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col bg-[#120a02] rounded-2xl overflow-hidden shadow-2xl border border-[#3d2510]"
        style={{
          width: format === '9:16' ? 'min(38vw, 420px)' : 'min(80vw, 900px)',
          maxHeight: '90vh',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3d2510] shrink-0">
          <div className="flex items-center gap-2">
            <Maximize2 size={14} className="text-[#7a6040]" />
            <span className="text-[#c8b88a] text-sm font-semibold">Preview</span>
            <span className="text-[10px] px-2 py-0.5 rounded border border-[#3d2510] text-[#7a6040]">
              {format}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7a6040] hover:text-[#e8d5a0] hover:bg-[#2d1a08] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Video area */}
        <div
          className="relative bg-black overflow-hidden shrink-0"
          style={{ aspectRatio: FORMAT_RATIO[format] }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            muted={muted}
            onTimeUpdate={onTimeUpdate}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />

          {/* Canvas Layers Overlay */}
          {layers && layers.map((layer) => (
            <div
              key={layer.id}
              className="absolute pointer-events-none select-none"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height}%`,
                zIndex: layer.zIndex,
              }}
            >
              <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                {layer.type === 'text' && (
                  <div
                    className="w-full h-full flex items-center justify-center text-center px-1"
                    style={{ backgroundColor: layer.bgColor || '#00000000' }}
                  >
                    <p
                      className="font-bold w-full break-words leading-normal"
                      style={{
                        fontSize: `${(layer.fontSize || 20) * 0.85}px`,
                        color: layer.color || '#ffffff',
                      }}
                    >
                      {layer.text || ''}
                    </p>
                  </div>
                )}

                {layer.type === 'image' && layer.src && (
                  <img
                    src={layer.src}
                    alt={layer.name}
                    className="w-full h-full object-contain"
                  />
                )}

                {layer.type === 'video' && layer.src && (
                  <video
                    src={layer.src}
                    className="w-full h-full object-contain"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                )}
              </div>
            </div>
          ))}

          {/* Subtitle overlay */}
          {activeSub && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 pointer-events-none" style={{ zIndex: 9999 }}>
              <div className="bg-black/70 text-white text-sm font-bold px-4 py-2 rounded-xl text-center max-w-full shadow-lg">
                {activeSub.text}
              </div>
            </div>
          )}

          {/* Center play/pause icon (brief flash) */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 9999 }}>
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                <Play size={28} className="text-white ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="px-4 py-3 flex flex-col gap-2 shrink-0">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="h-1.5 bg-[#2d1a08] rounded-full cursor-pointer group"
            onClick={seekTo}
          >
            <div
              className="h-full bg-[#c9b600] rounded-full relative transition-all"
              style={{ width: `${progressRatio * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#c9b600] rounded-full border-2 border-[#1a0c05] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-[#c9b600] text-[#1a0c05] flex items-center justify-center hover:bg-[#e0cc00] transition-colors shrink-0"
            >
              {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>

            <span className="text-[#7a6040] text-xs font-mono">
              {formatTime(currentTime)} / {formatTime(trimEnd)}
            </span>

            <div className="flex-1" />

            <button
              onClick={() => { setMuted(!muted); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7a6040] hover:text-[#c8b88a] hover:bg-[#2d1a08] transition-colors"
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
