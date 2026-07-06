'use client';

import { useRef } from 'react';
import { Upload, Wand2, Edit3, Trash2, ArrowLeft, Sliders, Paintbrush, Image as ImageIcon, Film as FilmIcon, Type as TypeIcon, Music } from 'lucide-react';
import { SubtitleChunk, Layer } from '@/types/editor';
import { parseSubtitleFile, formatTimestamp } from '@/lib/subtitle-parser';

interface SubtitlesPanelProps {
  subtitles: SubtitleChunk[];
  currentTime: number;
  duration: number;
  onSubtitlesChange: (chunks: SubtitleChunk[]) => void;
  onSeek: (time: number) => void;

  // Layer props
  layers: Layer[];
  selectedLayerId: string | null;
  onUpdateLayer: (layer: Layer) => void;
  onDeleteLayer: (id: string) => void;
  onSelectLayer: (id: string | null) => void;

  // Transcription props
  hasVideo?: boolean;
  onAutoGenerate?: () => void;
  isTranscribing?: boolean;
  transcriptionStatus?: string;
  whisperModel?: 'Xenova/whisper-tiny' | 'Xenova/whisper-small';
  setWhisperModel?: (model: 'Xenova/whisper-tiny' | 'Xenova/whisper-small') => void;
}

export default function SubtitlesPanel({
  subtitles,
  currentTime,
  duration,
  onSubtitlesChange,
  onSeek,
  layers,
  selectedLayerId,
  onUpdateLayer,
  onDeleteLayer,
  onSelectLayer,
  hasVideo,
  onAutoGenerate,
  isTranscribing,
  transcriptionStatus,
  whisperModel,
  setWhisperModel,
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

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  // If a canvas layer is selected, render the Layer Properties Editor
  if (selectedLayer) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      onUpdateLayer({
        ...selectedLayer,
        src: url,
      });
    };

    return (
      <aside className="w-72 bg-[#120a02] border-l border-[#3d2510] flex flex-col shrink-0 overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#3d2510] shrink-0">
          <button
            onClick={() => onSelectLayer(null)}
            className="text-[#7a6040] hover:text-[#c9b600] transition-colors p-1"
            title="Back to Subtitles"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[#e8d5a0] text-sm font-bold flex items-center gap-1.5">
            {selectedLayer.type === 'text' && <TypeIcon size={14} className="text-[#c9b600]" />}
            {selectedLayer.type === 'image' && <ImageIcon size={14} className="text-[#c9b600]" />}
            {selectedLayer.type === 'video' && <FilmIcon size={14} className="text-[#c9b600]" />}
            {selectedLayer.type === 'audio' && <Music size={14} className="text-[#c9b600]" />}
            Layer Editor
          </span>
        </div>

        {/* Inputs */}
        <div className="p-4 flex flex-col gap-4 flex-1">
          {/* Layer Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-[#7a6040] uppercase font-bold tracking-wider">Layer Name</label>
            <input
              type="text"
              value={selectedLayer.name}
              onChange={(e) => onUpdateLayer({ ...selectedLayer, name: e.target.value })}
              className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-3 py-1.5 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600]"
            />
          </div>

          {/* Size & Position */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[#7a6040] uppercase font-bold tracking-wider border-b border-[#3d2510]/50 pb-1">
              <Sliders size={11} />
              <span>Layout & Geometry</span>
            </div>

            {/* X and Y */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">X Position (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(selectedLayer.x)}
                  onChange={(e) => onUpdateLayer({ ...selectedLayer, x: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Y Position (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(selectedLayer.y)}
                  onChange={(e) => onUpdateLayer({ ...selectedLayer, y: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
                />
              </div>
            </div>

            {/* Width and Height */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Width (%)</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={Math.round(selectedLayer.width)}
                  onChange={(e) => onUpdateLayer({ ...selectedLayer, width: Math.max(5, Math.min(100, Number(e.target.value))) })}
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Height (%)</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={Math.round(selectedLayer.height)}
                  onChange={(e) => onUpdateLayer({ ...selectedLayer, height: Math.max(5, Math.min(100, Number(e.target.value))) })}
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
                />
              </div>
            </div>

            {/* Z Index (Z-Order) */}
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-[#5a4530]">Z-Index (Stack Order)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={selectedLayer.zIndex}
                onChange={(e) => onUpdateLayer({ ...selectedLayer, zIndex: Math.max(1, Number(e.target.value)) })}
                className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600] w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Show From (s)</label>
                <input
                  type="number"
                  min="0"
                  max={duration || undefined}
                  step="0.1"
                  value={Number(selectedLayer.startTime.toFixed(1))}
                  onChange={(e) => {
                    const next = Math.max(0, Number(e.target.value));
                    onUpdateLayer({
                      ...selectedLayer,
                      startTime: Math.min(next, selectedLayer.endTime - 0.1),
                    });
                  }}
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Show Until (s)</label>
                <input
                  type="number"
                  min="0"
                  max={duration || undefined}
                  step="0.1"
                  value={Number(selectedLayer.endTime.toFixed(1))}
                  onChange={(e) => {
                    const next = duration ? Math.min(duration, Number(e.target.value)) : Number(e.target.value);
                    onUpdateLayer({
                      ...selectedLayer,
                      endTime: Math.max(next, selectedLayer.startTime + 0.1),
                    });
                  }}
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Text Settings (Only for text layer) */}
          {selectedLayer.type === 'text' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-[#7a6040] uppercase font-bold tracking-wider border-b border-[#3d2510]/50 pb-1">
                <Paintbrush size={11} />
                <span>Text Styling</span>
              </div>

              {/* Text content textarea */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Text Content</label>
                <textarea
                  value={selectedLayer.text || ''}
                  onChange={(e) => onUpdateLayer({ ...selectedLayer, text: e.target.value })}
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600] h-16 resize-none"
                  placeholder="Type layer text..."
                />
              </div>

              {/* Font size */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[9px] text-[#5a4530]">
                  <span>Font Size</span>
                  <span className="font-mono">{selectedLayer.fontSize || 20}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={selectedLayer.fontSize || 20}
                  onChange={(e) => onUpdateLayer({ ...selectedLayer, fontSize: Number(e.target.value) })}
                  className="accent-[#c9b600] w-full"
                />
              </div>

              {/* Text color */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedLayer.color || '#ffffff'}
                    onChange={(e) => onUpdateLayer({ ...selectedLayer, color: e.target.value })}
                    className="w-8 h-8 rounded border border-[#3d2510] bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={selectedLayer.color || '#ffffff'}
                    onChange={(e) => onUpdateLayer({ ...selectedLayer, color: e.target.value })}
                    className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none flex-1 font-mono"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedLayer.bgColor === '#00000000' ? '#000000' : selectedLayer.bgColor || '#000000'}
                    onChange={(e) => onUpdateLayer({ ...selectedLayer, bgColor: e.target.value })}
                    className="w-8 h-8 rounded border border-[#3d2510] bg-transparent cursor-pointer"
                  />
                  <select
                    value={selectedLayer.bgColor === '#00000000' ? 'transparent' : 'custom'}
                    onChange={(e) => {
                      if (e.target.value === 'transparent') {
                        onUpdateLayer({ ...selectedLayer, bgColor: '#00000000' });
                      } else {
                        onUpdateLayer({ ...selectedLayer, bgColor: '#00000088' });
                      }
                    }}
                    className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
                  >
                    <option value="transparent">Transparent</option>
                    <option value="custom">Solid / Custom Color</option>
                  </select>
                </div>
                {selectedLayer.bgColor !== '#00000000' && (
                  <input
                    type="text"
                    value={selectedLayer.bgColor}
                    onChange={(e) => onUpdateLayer({ ...selectedLayer, bgColor: e.target.value })}
                    className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none font-mono"
                  />
                )}
              </div>
            </div>
          )}

          {/* Media source uploads (Only for Image/Video layer) */}
          {(selectedLayer.type === 'image' || selectedLayer.type === 'video' || selectedLayer.type === 'audio') && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[10px] text-[#7a6040] uppercase font-bold tracking-wider border-b border-[#3d2510]/50 pb-1">
                <Upload size={11} />
                <span>Media Source</span>
              </div>

              {/* Upload file */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    const el = document.getElementById(`layer-file-upload-${selectedLayer.id}`);
                    el?.click();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-[#2d1a08] border border-[#4a3010] hover:border-[#c9b600] text-[#c8b88a] text-xs font-semibold py-2.5 rounded-lg transition-colors"
                >
                  <Upload size={12} className="text-[#c9b600]" />
                  <span>
                    Choose {selectedLayer.type === 'audio' ? 'Audio' : selectedLayer.type === 'image' ? 'Image' : 'Video'} File
                  </span>
                </button>
                <input
                  id={`layer-file-upload-${selectedLayer.id}`}
                  type="file"
                  accept={selectedLayer.type === 'audio' ? 'audio/*' : selectedLayer.type === 'image' ? 'image/*' : 'video/*'}
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                {selectedLayer.src && (
                  <p className="text-[9px] text-green-500 font-medium text-center truncate">
                    ✓ File linked successfully
                  </p>
                )}
              </div>

              {/* Direct URL input */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-[#5a4530]">Or paste direct URL</label>
                <input
                  type="text"
                  value={selectedLayer.src || ''}
                  onChange={(e) => onUpdateLayer({ ...selectedLayer, src: e.target.value })}
                  placeholder="https://example.com/asset..."
                  className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600]"
                />
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Delete Layer button */}
          <button
            onClick={() => onDeleteLayer(selectedLayer.id)}
            className="w-full flex items-center justify-center gap-2 bg-red-950/45 hover:bg-red-900/60 border border-red-900/60 text-red-300 text-xs font-semibold py-2.5 rounded-lg transition-colors mt-4"
          >
            <Trash2 size={13} />
            <span>Delete Layer</span>
          </button>
        </div>
      </aside>
    );
  }

  // DEFAULT UI: Subtitles editor (when no layer is selected)
  return (
    <aside className="w-72 bg-[#120a02] border-l border-[#3d2510] flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3d2510]">
        <h2 className="text-[#e8d5a0] text-sm font-bold">Subtitles</h2>
        <div className="flex items-center gap-2">
          <button
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
              isTranscribing
                ? 'bg-[#3d2510] text-[#7a6040] border-[#3d2510] cursor-wait'
                : 'bg-[#2d1a08] text-[#c9b600] border-[#c9b600] hover:bg-[#3d2510]'
            }`}
            onClick={onAutoGenerate}
            disabled={isTranscribing || !hasVideo}
            title={!hasVideo ? 'Upload a video first' : isTranscribing ? 'Transcribing...' : 'Auto-generate subtitles with Whisper AI'}
          >
            <Wand2 size={10} className={isTranscribing ? 'animate-spin' : ''} />
            {isTranscribing ? 'Working...' : 'Auto-gen'}
          </button>
          <button className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2d1a08] text-[#c8b88a] border border-[#3d2510] hover:border-[#7a6040] transition-colors">
            <Edit3 size={10} />
          </button>
        </div>
      </div>

      {/* Engine / Lang / Model selector */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[#3d2510] flex-wrap">
        <span className="text-[#7a6040] text-[10px]">Engine:</span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#c9b600] text-[#c9b600]">Whisper</span>
        <span className="text-[#7a6040] text-[10px] ml-1">Model:</span>
        <select
          value={whisperModel || 'Xenova/whisper-tiny'}
          onChange={(e) => setWhisperModel?.(e.target.value as any)}
          disabled={isTranscribing}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1f1005] border border-[#3d2510] text-[#c9b600] outline-none focus:border-[#c9b600] cursor-pointer disabled:opacity-50"
        >
          <option value="Xenova/whisper-tiny">Tiny (fast)</option>
          <option value="Xenova/whisper-small">Small (accurate)</option>
        </select>
      </div>

      {/* Transcription status banner */}
      {isTranscribing && transcriptionStatus && (
        <div className="px-4 py-2 border-b border-[#3d2510] bg-[#1f1005]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#c9b600] animate-pulse shrink-0" />
            <p className="text-[10px] text-[#c9b600] font-medium truncate">{transcriptionStatus}</p>
          </div>
        </div>
      )}

      {/* Auto-generate / Upload button */}
      <div className="px-4 py-2 border-b border-[#3d2510] flex flex-col gap-2">
        <button
          className={`w-full flex items-center justify-center gap-2 border text-xs font-semibold py-2 rounded-lg transition-colors ${
            isTranscribing
              ? 'bg-[#3d2510] border-[#4a3010] text-[#7a6040] cursor-wait'
              : !hasVideo
                ? 'bg-[#1f1005] border-[#3d2510] text-[#5a4530] cursor-not-allowed'
                : 'bg-[#2d1a08] border-[#4a3010] hover:border-[#c9b600] text-[#c8b88a]'
          }`}
          onClick={onAutoGenerate}
          disabled={isTranscribing || !hasVideo}
        >
          <Wand2 size={12} className={`text-[#c9b600] ${isTranscribing ? 'animate-spin' : ''}`} />
          {isTranscribing ? 'Generating Subtitles...' : 'Auto-Generate'}
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
