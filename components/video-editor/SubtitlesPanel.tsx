'use client';

import { useRef } from 'react';
import { Upload, Download, Wand2, Edit3 } from 'lucide-react';
import { SubtitleChunk } from '@/types/editor';
import { parseSubtitleFile, formatTimestamp } from '@/lib/subtitle-parser';

interface SubtitlesPanelProps {
  subtitles: SubtitleChunk[];
  currentTime: number;
  duration: number;
  onSubtitlesChange: (chunks: SubtitleChunk[]) => void;
  onSeek: (time: number) => void;
}

export default function SubtitlesPanel({
  subtitles,
  currentTime,
  duration,
  onSubtitlesChange,
  onSeek,
}: SubtitlesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const chunks = await parseSubtitleFile(file);
    onSubtitlesChange(chunks);
    e.target.value = '';
  }

  function handleChunkTextChange(id: string, text: string) {
    onSubtitlesChange(subtitles.map((c) => (c.id === id ? { ...c, text } : c)));
  }

  function exportSRT(): void {
    const lines = subtitles.map((chunk, i) => {
      const start = toSRTTime(chunk.startTime);
      const end = toSRTTime(chunk.endTime);
      return `${i + 1}\n${start} --> ${end}\n${chunk.text}`;
    });
    downloadFile(lines.join('\n\n'), 'subtitles.srt', 'text/plain');
  }

  function exportVTT(): void {
    const lines = ['WEBVTT', '', ...subtitles.map((chunk, i) => {
      const start = toVTTTime(chunk.startTime);
      const end = toVTTTime(chunk.endTime);
      return `${i + 1}\n${start} --> ${end}\n${chunk.text}`;
    })];
    downloadFile(lines.join('\n\n'), 'subtitles.vtt', 'text/vtt');
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeIndex = subtitles.findIndex(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  return (
    <aside className="w-72 bg-[#120a02] border-l border-[#3d2510] flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3d2510]">
        <h2 className="text-[#e8d5a0] text-sm font-bold">Subtitles</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#2d1a08] text-[#c9b600] border border-[#c9b600] hover:bg-[#3d2510] transition-colors">
            <Wand2 size={10} />
            Auto-gen
          </button>
          <button className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2d1a08] text-[#c8b88a] border border-[#3d2510] hover:border-[#7a6040] transition-colors">
            <Edit3 size={10} />
          </button>
        </div>
      </div>

      {/* Engine / Lang */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#3d2510]">
        <span className="text-[#7a6040] text-[10px]">Engine:</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#c9b600] text-[#c9b600]">Whisper</span>
        <span className="text-[#7a6040] text-[10px] ml-1">Lang:</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#c9b600] text-[#1a0c05]">EN</span>
      </div>

      {/* Auto-generate / Upload button */}
      <div className="px-4 py-2 border-b border-[#3d2510] flex flex-col gap-2">
        <button
          className="w-full flex items-center justify-center gap-2 bg-[#2d1a08] border border-[#4a3010] hover:border-[#c9b600] text-[#c8b88a] text-xs font-semibold py-2 rounded-lg transition-colors"
          onClick={() => {}}
        >
          <Wand2 size={12} className="text-[#c9b600]" />
          Auto-Generate
        </button>
        <button
          className="w-full flex items-center justify-center gap-2 bg-[#1f1005] border border-[#3d2510] hover:border-[#7a6040] text-[#7a6040] hover:text-[#c8b88a] text-xs py-2 rounded-lg transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={12} />
          Upload SRT / VTT / JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt,.vtt,.json"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Subtitle chunks */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2 scrollbar-thin"
      >
        {subtitles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-[#5a4530] text-xs">No subtitles yet.</p>
            <p className="text-[#3d2510] text-[10px]">Upload a file or auto-generate</p>
          </div>
        ) : (
          subtitles.map((chunk, i) => (
            <div
              key={chunk.id}
              className={`rounded-lg border transition-all cursor-pointer ${
                i === activeIndex
                  ? 'border-[#c9b600] bg-[#2d1a08]'
                  : 'border-[#3d2510] bg-[#1f1005] hover:border-[#4a3010]'
              }`}
              onClick={() => onSeek(chunk.startTime)}
            >
              {/* Timeline bar */}
              <div className="h-5 bg-[#8b8c20] rounded-t-lg opacity-80 mx-0" />
              {/* Content */}
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#7a6040] text-[9px] font-mono">
                    {formatTimestamp(chunk.startTime)} – {formatTimestamp(chunk.endTime)}
                  </span>
                </div>
                <textarea
                  value={chunk.text}
                  onChange={(e) => handleChunkTextChange(chunk.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  rows={2}
                  className="w-full text-[#c8b88a] text-[11px] bg-transparent resize-none outline-none leading-relaxed"
                  placeholder="Subtitle text..."
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export */}
      <div className="px-4 py-3 border-t border-[#3d2510]">
        <div className="flex items-center gap-1 text-[#5a4530] text-[10px]">
          <span>Export as</span>
          <button onClick={exportSRT} className="text-[#9a8060] hover:text-[#c9b600] underline transition-colors">SRT</button>
          <span>·</span>
          <button onClick={exportVTT} className="text-[#9a8060] hover:text-[#c9b600] underline transition-colors">VTT</button>
          <span>·</span>
          <button className="text-[#9a8060] hover:text-[#c9b600] underline transition-colors">Burned-in</button>
        </div>
      </div>
    </aside>
  );
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

function toSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}

function toVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(ms).padStart(3, '0')}`;
}
