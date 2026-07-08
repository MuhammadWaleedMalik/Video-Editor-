'use client';

import LayerPropertiesPanel from './LayerPropertiesPanel';
import { ArrowLeft, Move } from 'lucide-react';
import { CanvasObject, Layer, SubtitleChunk } from '@/types/editor';
import SubtitleEditorPanel from './SubtitleEditorPanel';

interface SubtitlesPanelProps {
  subtitles: SubtitleChunk[];
  currentTime: number;
  duration: number;
  onSubtitlesChange: (chunks: SubtitleChunk[]) => void;
  onSeek: (time: number) => void;

  layers: Layer[];
  selectedLayerId: string | null;
  canvasObjects: CanvasObject[];
  selectedCanvasObjectId: string | null;
  onUpdateLayer: (layer: Layer) => void;
  onUpdateCanvasObject: (object: CanvasObject) => void;
  onSelectClip: (id: string | null) => void;
  onDeleteLayer: (id: string) => void;
  onSelectLayer: (id: string | null) => void;
  onAutoTranscribe: () => void;
  onTranscribePause: () => void;
  onTranscribeResume: () => void;
  onTranscribeCancel: () => void;
  transcribeStatus: string;
  isTranscribing: boolean;
  transcribeLanguage: 'en' | 'ur' | 'auto';
  onTranscribeLanguageChange: (language: 'en' | 'ur' | 'auto') => void;
  subtitleFontScale: number;
  subtitleFontFamily: string;
  onSubtitleFontScaleChange: (scalePercent: number) => void;
  onSubtitleFontFamilyChange: (fontFamily: string) => void;
}

export default function SubtitlesPanel({
  subtitles,
  currentTime,
  duration,
  onSubtitlesChange,
  onSeek,
  layers,
  selectedLayerId,
  canvasObjects,
  selectedCanvasObjectId,
  onUpdateLayer,
  onUpdateCanvasObject,
  onSelectClip,
  onDeleteLayer,
  onSelectLayer,
  onAutoTranscribe,
  onTranscribePause,
  onTranscribeResume,
  onTranscribeCancel,
  transcribeStatus,
  isTranscribing,
  transcribeLanguage,
  onTranscribeLanguageChange,
  subtitleFontScale,
  subtitleFontFamily,
  onSubtitleFontScaleChange,
  onSubtitleFontFamilyChange,
}: SubtitlesPanelProps) {
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);
  const selectedCanvasObject = canvasObjects.find((object) => object.id === selectedCanvasObjectId);

  if (selectedLayer) {
    return (
      <LayerPropertiesPanel
        layer={selectedLayer}
        duration={duration}
        onBack={() => onSelectLayer(null)}
        onUpdate={(nextLayer) => onUpdateLayer(nextLayer)}
        onDelete={onDeleteLayer}
      />
    );
  }

  if (selectedCanvasObject) {
    const updateNumber = (field: 'x' | 'y' | 'width' | 'height', value: number) => {
      const safe = Number.isFinite(value) ? value : selectedCanvasObject[field];
      const nextValue = field === 'width' || field === 'height'
        ? Math.max(1, Math.min(100, safe))
        : Math.max(0, Math.min(100, safe));
      onUpdateCanvasObject({ ...selectedCanvasObject, [field]: nextValue });
    };

    return (
      <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-y-auto border-l border-[#3d2510] bg-[#120a02] scrollbar-thin">
        <div className="flex items-center gap-2 border-b border-[#3d2510] px-4 py-3 shrink-0">
          <button
            onClick={() => onSelectClip(null)}
            className="p-1 text-[#7a6040] transition-colors hover:text-[#c9b600]"
            title="Deselect media"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="flex items-center gap-1.5 text-sm font-bold text-[#e8d5a0]">
            <Move size={14} className="text-[#c9b600]" />
            Canvas Media
          </span>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y', 'width', 'height'] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-[9px] uppercase text-[#5a4530]">
                  {field === 'width' ? 'Width' : field === 'height' ? 'Height' : field.toUpperCase()} (%)
                </span>
                <input
                  type="number"
                  min={field === 'width' || field === 'height' ? 1 : 0}
                  max={100}
                  step="0.1"
                  value={Number(selectedCanvasObject[field].toFixed(1))}
                  onChange={(e) => updateNumber(field, Number(e.target.value))}
                  className="rounded-lg border border-[#3d2510] bg-[#1f1005] px-2 py-1 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600]"
                />
              </label>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-[#7a6040]">
            Drag the selected media on the canvas to move it, or drag a corner handle to resize it.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <SubtitleEditorPanel
      subtitles={subtitles}
      currentTime={currentTime}
      subtitleFontScale={subtitleFontScale}
      subtitleFontFamily={subtitleFontFamily}
      transcribeLanguage={transcribeLanguage}
      transcribeStatus={transcribeStatus}
      isTranscribing={isTranscribing}
      onSubtitlesChange={onSubtitlesChange}
      onSeek={onSeek}
      onAutoTranscribe={onAutoTranscribe}
      onTranscribePause={onTranscribePause}
      onTranscribeResume={onTranscribeResume}
      onTranscribeCancel={onTranscribeCancel}
      onTranscribeLanguageChange={onTranscribeLanguageChange}
      onSubtitleFontScaleChange={onSubtitleFontScaleChange}
      onSubtitleFontFamilyChange={onSubtitleFontFamilyChange}
    />
  );
}
