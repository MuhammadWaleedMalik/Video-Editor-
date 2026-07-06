'use client';

import LayerPropertiesPanel from './LayerPropertiesPanel';
import { Layer, SubtitleChunk } from '@/types/editor';
import SubtitleEditorPanel from './SubtitleEditorPanel';

interface SubtitlesPanelProps {
  subtitles: SubtitleChunk[];
  currentTime: number;
  duration: number;
  onSubtitlesChange: (chunks: SubtitleChunk[]) => void;
  onSeek: (time: number) => void;

  layers: Layer[];
  selectedLayerId: string | null;
  onUpdateLayer: (layer: Layer) => void;
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
  onUpdateLayer,
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
