import { useCallback, useRef, useState, useMemo } from 'react';
import { EditorState, LayerType } from '@/types/editor';
import { createBlobUrl, revokeBlobUrl } from '@/lib/videoAssets';
import { extractWaveform, initialState, createDefaultLayer } from './videoEditorDefaults';
import { usePlaybackControllers } from './videoEditorPlayback';
import { useLayerControllers } from './videoEditorLayers';
import { useSubtitleControllers } from './videoEditorSubtitles';
import { getTrimSegments } from './segments';
import { loadEditorDraft } from '@/lib/editorDraft';

export interface VideoEditorController {
  state: EditorState;
  title: string;
  setTitle: (title: string) => void;
  waveformData: Float32Array | null;
  trimSegments: Array<{ startTime: number; endTime: number }>;
  isTranscribing: boolean;
  transcribeStatus: string;
  transcribeLanguage: 'en' | 'ur' | 'auto';
  showPreview: boolean;
  setShowPreview: (value: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  set: (patch: Partial<EditorState>) => void;
  handleVideoUpload: (file: File) => void;
  handlePlayPause: () => void;
  handleTimeUpdate: (time: number) => void;
  handleDurationChange: (duration: number) => void;
  handleSeek: (time: number) => void;
  handleFormatChange: (format: EditorState['format']) => void;
  handleTrimChange: (start: number, end: number) => void;
  handleAddLayer: (type: LayerType) => void;
  handleAddLayerAtCoords: (type: Exclude<LayerType, 'audio'>, x: number, y: number) => void;
  handleUpdateLayer: (layer: EditorState['layers'][number]) => void;
  handleDeleteLayer: (id: string) => void;
  handleSelectLayer: (id: string | null) => void;
  handleLayerTimingChange: (id: string, startTime: number, endTime: number) => void;
  handleLayerOrderChange: (id: string, direction: 'front' | 'back') => void;
  handleSubtitlesChange: (chunks: EditorState['subtitles']) => void;
  handleTranscribeLanguageChange: (language: 'en' | 'ur' | 'auto') => void;
  handleAutoTranscribe: () => Promise<void>;
  handleTranscribePause: () => void;
  handleTranscribeResume: () => void;
  handleTranscribeCancel: () => void;
  handleAudioMuteToggle: () => void;
  handleAudioRemove: () => void;
  handleSubtitleFontScaleChange: (scalePercent: number) => void;
  handleSubtitleFontFamilyChange: (fontFamily: string) => void;
  handlePlaybackRateChange: (playbackRate: number) => void;
}

export default function useVideoEditorController(): VideoEditorController {
  const restoredDraft = typeof window === 'undefined' ? null : loadEditorDraft();
  const [state, setState] = useState<EditorState>(() => restoredDraft ? {
    ...initialState,
    videoUrl: restoredDraft.videoUrl,
    duration: restoredDraft.duration,
    currentTime: restoredDraft.trimStart || 0,
    trimStart: restoredDraft.trimStart,
    trimEnd: restoredDraft.trimEnd,
    subtitles: restoredDraft.subtitles,
    hasAudio: restoredDraft.hasAudio,
    audioMuted: restoredDraft.audioMuted,
    subtitleFontScale: restoredDraft.subtitleFontScale,
    subtitleFontFamily: restoredDraft.subtitleFontFamily,
    format: restoredDraft.format,
    layers: restoredDraft.layers,
  } : initialState);
  const [title, setTitle] = useState(restoredDraft?.title ?? 'My Video Draft');
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeLanguage, setTranscribeLanguage] = useState<'en' | 'ur' | 'auto'>('en');
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const trimSegments = useMemo(
    () => getTrimSegments(state.duration, state.trimStart, state.trimEnd),
    [state.duration, state.trimStart, state.trimEnd]
  );

  const set = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const playback = usePlaybackControllers(state, set, trimSegments, videoRef);
  const layers = useLayerControllers(state, set);
  const subtitles = useSubtitleControllers(
    state,
    set,
    videoRef,
    transcribeLanguage,
    setTranscribeLanguage,
    isTranscribing,
    setIsTranscribing,
    transcribeStatus,
    setTranscribeStatus,
    setWaveformData
  );

  function handleVideoUpload(file: File) {
    if (state.videoUrl) revokeBlobUrl(state.videoUrl);
    const url = createBlobUrl(file);
    setWaveformData(null);
    set({
      videoFile: file,
      videoUrl: url,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      trimStart: 0,
      trimEnd: 0,
      hasAudio: true,
      audioMuted: false,
    });
    setIsTranscribing(false);
    setTranscribeStatus('');
    extractWaveform(url).then((data) => setWaveformData(data ?? null));
  }

  function handleAddLayer(type: LayerType) {
    const newLayer = createDefaultLayer(type, state.layers.length);
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  return {
    state,
    title,
    setTitle,
    waveformData,
    trimSegments,
    isTranscribing,
    transcribeStatus,
    transcribeLanguage,
    showPreview,
    setShowPreview,
    videoRef,
    set,
    handleVideoUpload,
    handlePlayPause: playback.handlePlayPause,
    handleTimeUpdate: playback.handleTimeUpdate,
    handleDurationChange: playback.handleDurationChange,
    handleSeek: playback.handleSeek,
    handleFormatChange: playback.handleFormatChange,
    handleTrimChange: playback.handleTrimChange,
    handleAddLayer,
    handleAddLayerAtCoords: layers.handleAddLayerAtCoords,
    handleUpdateLayer: layers.handleUpdateLayer,
    handleDeleteLayer: layers.handleDeleteLayer,
    handleSelectLayer: layers.handleSelectLayer,
    handleLayerTimingChange: layers.handleLayerTimingChange,
    handleLayerOrderChange: layers.handleLayerOrderChange,
    handleSubtitlesChange: subtitles.handleSubtitlesChange,
    handleTranscribeLanguageChange: subtitles.handleTranscribeLanguageChange,
    handleAutoTranscribe: subtitles.handleAutoTranscribe,
    handleTranscribePause: subtitles.handleTranscribePause,
    handleTranscribeResume: subtitles.handleTranscribeResume,
    handleTranscribeCancel: subtitles.handleTranscribeCancel,
    handleAudioMuteToggle: subtitles.handleAudioMuteToggle,
    handleAudioRemove: subtitles.handleAudioRemove,
    handleSubtitleFontScaleChange: subtitles.handleSubtitleFontScaleChange,
    handleSubtitleFontFamilyChange: subtitles.handleSubtitleFontFamilyChange,
    handlePlaybackRateChange: playback.handlePlaybackRateChange,
  };
}
