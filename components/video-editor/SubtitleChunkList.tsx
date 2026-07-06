'use client';

import { formatTimestamp } from '@/lib/subtitle-parser';
import { SubtitleChunk } from '@/types/editor';

interface SubtitleChunkListProps {
  subtitles: SubtitleChunk[];
  activeIndex: number;
  onSeek: (time: number) => void;
  onChunkTextChange: (id: string, text: string) => void;
}

export default function SubtitleChunkList({
  subtitles,
  activeIndex,
  onSeek,
  onChunkTextChange,
}: SubtitleChunkListProps) {
  if (subtitles.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-[#5a4530] text-xs">No subtitles yet.</p>
        <p className="text-[#3d2510] text-[10px]">Upload SRT / VTT / JSON</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-2 scrollbar-thin">
      {subtitles.map((chunk, index) => (
        <div
          key={chunk.id}
          className={`rounded-lg border transition-all cursor-pointer ${
            index === activeIndex
              ? 'border-[#c9b600] bg-[#2d1a08]'
              : 'border-[#3d2510] bg-[#1f1005] hover:border-[#4a3010]'
          }`}
          onClick={() => onSeek(chunk.startTime)}
        >
          <div className="h-5 bg-[#8b8c20] rounded-t-lg opacity-80 mx-0" />
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#7a6040] text-[9px] font-mono">
                {formatTimestamp(chunk.startTime)} - {formatTimestamp(chunk.endTime)}
              </span>
            </div>
            <textarea
              value={chunk.text}
              onChange={(e) => onChunkTextChange(chunk.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={2}
              className="w-full text-[#c8b88a] text-[11px] bg-transparent resize-none outline-none leading-relaxed"
              placeholder="Subtitle text..."
            />
          </div>
        </div>
      ))}
    </div>
  );
}
