'use client';

import { useRef } from 'react';
import { Edit3, Upload } from 'lucide-react';
import { ChangeEvent } from 'react';
import { parseSubtitleFile } from '@/lib/subtitle-parser';
import { TEXT_THEMES } from '@/lib/textThemes';
import { SubtitleChunk } from '@/types/editor';
import SubtitleChunkList from './SubtitleChunkList';
import TranscriptionControls from './TranscriptionControls';

interface SubtitleEditorPanelProps {
  subtitles: SubtitleChunk[];
  currentTime: number;
  subtitleFontScale: number;
  subtitleFontFamily: string;
  transcribeLanguage: 'en' | 'ur' | 'auto';
  transcribeStatus: string;
  isTranscribing: boolean;
  onSubtitlesChange: (chunks: SubtitleChunk[]) => void;
  onSeek: (time: number) => void;
  onAutoTranscribe: () => void;
  onTranscribePause: () => void;
  onTranscribeResume: () => void;
  onTranscribeCancel: () => void;
  onTranscribeLanguageChange: (language: 'en' | 'ur' | 'auto') => void;
  onSubtitleFontScaleChange: (scalePercent: number) => void;
  onSubtitleFontFamilyChange: (fontFamily: string) => void;
}

export default function SubtitleEditorPanel({
  subtitles,
  currentTime,
  subtitleFontScale,
  subtitleFontFamily,
  transcribeLanguage,
  transcribeStatus,
  isTranscribing,
  onSubtitlesChange,
  onSeek,
  onAutoTranscribe,
  onTranscribePause,
  onTranscribeResume,
  onTranscribeCancel,
  onTranscribeLanguageChange,
  onSubtitleFontScaleChange,
  onSubtitleFontFamilyChange,
}: SubtitleEditorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeIndex = subtitles.findIndex((chunk) => currentTime >= chunk.startTime && currentTime <= chunk.endTime);

  async function handleFileUpload(fileInput: ChangeEvent<HTMLInputElement>) {
    const file = fileInput.target.files?.[0];
    if (!file) return;
    const chunks = await parseSubtitleFile(file);
    onSubtitlesChange(chunks);
    fileInput.target.value = '';
  }

  function handleChunkTextChange(id: string, text: string) {
    onSubtitlesChange(subtitles.map((chunk) => (chunk.id === id ? { ...chunk, text } : chunk)));
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function toSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  function exportSRT(): void {
    const lines = subtitles.map((chunk, index) => `${index + 1}\n${toSRTTime(chunk.startTime)} --> ${toSRTTime(chunk.endTime)}\n${chunk.text}`);
    downloadFile(lines.join('\n\n'), 'subtitles.srt', 'text/plain');
  }

  function exportVTT(): void {
    const lines = [
      'WEBVTT',
      '',
      ...subtitles.map(
        (chunk, index) =>
          `${index + 1}\n${toSRTTime(chunk.startTime).replace(',', '.')} --> ${toSRTTime(chunk.endTime).replace(',', '.')}\n${chunk.text}`,
      ),
    ];
    downloadFile(lines.join('\n\n'), 'subtitles.vtt', 'text/vtt');
  }

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[#3d2510] bg-[#120a02] md:border-l md:border-t-0">
      <div className="flex items-center justify-between border-b border-[#3d2510] px-5 py-4">
        <h2 className="text-base font-bold text-[#e8d5a0]">Subtitles</h2>
        <button className="rounded border border-[#3d2510] bg-[#2d1a08] px-3 py-1 text-[11px] font-bold text-[#c8b88a]">
          <Edit3 size={12} />
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-[#3d2510] px-5 py-4">
        <label className="text-[9px] text-[#7a6040] uppercase font-bold tracking-wider">Subtitle Font</label>
        <select
          value={subtitleFontFamily}
          onChange={(e) => onSubtitleFontFamilyChange(e.target.value)}
          className="rounded-lg border border-[#3d2510] bg-[#1f1005] px-3 py-2 text-sm text-[#e8d5a0] outline-none"
        >
          {TEXT_THEMES.map((theme) => (
            <option key={theme.id} value={theme.fontFamily}>
              {theme.name}
            </option>
          ))}
          <option value="Georgia, serif">Georgia</option>
          <option value="Times New Roman, serif">Times New Roman</option>
        </select>

        <label className="text-[9px] text-[#7a6040] uppercase font-bold tracking-wider">Subtitle Size</label>
        <div className="flex items-center justify-between text-[9px] text-[#5a4530]">
          <span>Scale</span>
          <span className="font-mono">{subtitleFontScale}%</span>
        </div>
        <input
          type="range"
          min="50"
          max="180"
          step="5"
          value={subtitleFontScale}
          onChange={(e) => onSubtitleFontScaleChange(Number(e.target.value))}
          className="accent-[#c9b600] w-full"
        />

        <label className="text-[9px] text-[#7a6040] uppercase font-bold tracking-wider">Subtitle Language</label>
        <select
          value={transcribeLanguage}
          onChange={(e) => onTranscribeLanguageChange(e.target.value as 'en' | 'ur' | 'auto')}
          className="rounded-lg border border-[#3d2510] bg-[#1f1005] px-3 py-2 text-sm text-[#e8d5a0] outline-none"
        >
          <option value="auto">Auto</option>
          <option value="en">English</option>
          <option value="ur">Urdu</option>
        </select>

        <TranscriptionControls
          isTranscribing={isTranscribing}
          status={transcribeStatus}
          onAutoTranscribe={onAutoTranscribe}
          onPause={onTranscribePause}
          onResume={onTranscribeResume}
          onCancel={onTranscribeCancel}
        />

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#3d2510] bg-[#1f1005] py-2.5 text-sm text-[#7a6040] transition-colors hover:border-[#7a6040] hover:text-[#c8b88a]"
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

      <SubtitleChunkList
        subtitles={subtitles}
        activeIndex={activeIndex}
        onSeek={onSeek}
        onChunkTextChange={handleChunkTextChange}
      />

      <div className="border-t border-[#3d2510] px-5 py-4">
        <div className="flex items-center gap-1 text-[#5a4530] text-[10px] flex-wrap">
          <span>Export as</span>
          <button onClick={exportSRT} className="text-[#9a8060] hover:text-[#c9b600] underline transition-colors">
            SRT
          </button>
          <span>|</span>
          <button onClick={exportVTT} className="text-[#9a8060] hover:text-[#c9b600] underline transition-colors">
            VTT
          </button>
        </div>
      </div>
    </aside>
  );
}
