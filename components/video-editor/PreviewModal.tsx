'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { VideoFormat, Layer, SubtitleChunk } from '@/types/editor';
import { FORMAT_RATIO } from './videoCanvas';
import { buildSRT, buildVTT, downloadTextFile } from './previewExport';
import {
  getSegmentAtOrAfter,
  getTimelineDuration,
  getTrimSegments,
  mapLinearToSegmentTime,
  mapSegmentTimeToLinear,
} from './segments';
import PreviewCanvas from './PreviewCanvas';
import PreviewFooter from './PreviewFooter';

interface PreviewModalProps {
  videoUrl: string;
  format: VideoFormat;
  subtitles: SubtitleChunk[];
  trimStart: number;
  trimEnd: number;
  audioMuted: boolean;
  onClose: () => void;
  layers?: Layer[];
  subtitleFontScale: number;
  subtitleFontFamily: string;
}

export default function PreviewModal({
  videoUrl,
  format,
  subtitles,
  trimStart,
  trimEnd,
  audioMuted,
  onClose,
  layers = [],
  subtitleFontScale,
  subtitleFontFamily,
}: PreviewModalProps) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(audioMuted);
  const [currentTime, setCurrentTime] = useState(() => trimStart || 0);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const safeStart = trimStart > 0 && Number.isFinite(trimStart) ? trimStart : 0;
  const safeEnd = trimEnd > 0 && Number.isFinite(trimEnd) ? trimEnd : 1;
  const segments = useMemo(() => getTrimSegments(safeEnd, safeStart, safeEnd), [safeEnd, safeStart]);
  const totalDuration = getTimelineDuration(segments);
  const activeSub = useMemo(
    () => subtitles.find((chunk) => currentTime >= chunk.startTime && currentTime <= chunk.endTime) ?? null,
    [currentTime, subtitles]
  );

  const togglePlay = useCallback(() => {
    if (!videoRef) return;
    if (playing) {
      videoRef.pause();
      setPlaying(false);
      return;
    }
    const active = getSegmentAtOrAfter(segments, currentTime) ?? segments[0];
    const seekTo = active ? Math.min(active.endTime, Math.max(active.startTime, currentTime)) : safeStart;
    videoRef.currentTime = seekTo;
    setCurrentTime(seekTo);
    void videoRef.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [playing, currentTime, safeStart, segments, videoRef]);

  useEffect(() => {
    if (!videoRef) return;
    const restart = segments[0]?.startTime ?? safeStart;
    videoRef.currentTime = restart;
    setCurrentTime(restart);
  }, [videoRef, safeStart, segments]);

  useEffect(() => setMuted(audioMuted), [audioMuted]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, togglePlay]);

  function onSeek(nextTime: number) {
    if (!videoRef) return;
    videoRef.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function onTimeUpdate() {
    if (!videoRef) return;
    const time = videoRef.currentTime;
    const segmentIndex = segments.findIndex((segment) => time >= segment.startTime && time <= segment.endTime);
    if (segmentIndex === -1) {
      const active = getSegmentAtOrAfter(segments, time);
      if (active) {
        videoRef.currentTime = active.startTime;
        setCurrentTime(active.startTime);
        return;
      }
    }

    const segment = segments[segmentIndex];
    if (!segment) {
      videoRef.pause();
      setPlaying(false);
      setCurrentTime(safeStart);
      return;
    }
    if (playing && time >= segment.endTime - 0.03) {
      const next = segments[segmentIndex + 1];
      if (next) {
        videoRef.currentTime = next.startTime;
        setCurrentTime(next.startTime);
      } else {
        videoRef.pause();
        setPlaying(false);
        setCurrentTime(segment.endTime);
      }
      return;
    }

    setCurrentTime(time);
  }

  function onEnded() {
    setPlaying(false);
  }

  const progress = totalDuration ? mapSegmentTimeToLinear(segments, currentTime) / totalDuration : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92svh] w-[98vw] max-w-[980px] flex-col overflow-hidden rounded-2xl border border-[#3d2510] bg-[#120a02] shadow-2xl supports-[height:100dvh]:max-h-[92dvh] sm:w-[92vw]">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#3d2510] shrink-0">
          <div className="flex items-center gap-2">
            <Maximize2 size={14} className="text-[#7a6040]" />
            <span className="text-[#c8b88a] text-sm font-semibold">Preview</span>
            <span className="text-[10px] px-2 py-0.5 rounded border border-[#3d2510] text-[#7a6040]">{format}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7a6040] hover:text-[#e8d5a0] hover:bg-[#2d1a08] transition-colors"
          >
            <X size={15} />
          </button>
        </header>

        <div
          className="relative w-full shrink overflow-hidden bg-black"
          style={{ aspectRatio: FORMAT_RATIO[format], maxHeight: 'calc(92svh - 126px)' }}
        >
          <PreviewCanvas
            format={format}
            currentTime={currentTime}
            videoUrl={videoUrl}
            muted={muted}
            activeSub={activeSub}
            playing={playing}
            subtitleFontFamily={subtitleFontFamily}
            subtitleFontScale={subtitleFontScale}
            layers={layers}
            onRefReady={setVideoRef}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onClick={togglePlay}
          />
        </div>

        <PreviewFooter
          progress={progress}
          currentTime={currentTime}
          totalDuration={totalDuration}
          startAt={safeStart}
          playing={playing}
          muted={muted}
          onTogglePlay={togglePlay}
          onSeek={(linearTime) => onSeek(mapLinearToSegmentTime(segments, linearTime - safeStart))}
          onToggleMute={() => setMuted((prev) => !prev)}
          onExportSrt={() => downloadTextFile(buildSRT(subtitles), 'subtitles.srt', 'text/plain')}
          onExportVtt={() => downloadTextFile(buildVTT(subtitles), 'subtitles.vtt', 'text/vtt')}
        />
      </div>
    </div>
  );
}
