import { useCallback, useRef, useState } from 'react';
import { CanvasObject, EditorState, LayerType, MediaAsset, TimelineClip } from '@/types/editor';
import { loadImageMetadata, loadVideoMetadata, uploadMediaFile } from '@/lib/videoAssets';
import { extractWaveform, initialState, createDefaultLayer } from './videoEditorDefaults';
import { usePlaybackControllers } from './videoEditorPlayback';
import { useLayerControllers } from './videoEditorLayers';
import { useSubtitleControllers } from './videoEditorSubtitles';
import { loadEditorDraft } from '@/lib/editorDraft';
import {
  calculateTimelineDuration,
  calculateLayerTimelineDuration,
  clampPlayhead,
  moveClip,
  reorderTimelineStack,
  resizeImageClipEnd,
  trimClipEnd,
  trimClipStart,
} from './timelineModel';

export interface VideoEditorController {
  state: EditorState;
  title: string;
  setTitle: (title: string) => void;
  waveformData: Float32Array | null;
  isTranscribing: boolean;
  transcribeStatus: string;
  transcribeLanguage: 'en' | 'ur' | 'auto';
  showPreview: boolean;
  setShowPreview: (value: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  set: (patch: Partial<EditorState>) => void;
  handleVideoUpload: (file: File) => void;
  handleImageUpload: (file: File) => void;
  handlePlaceAsset: (assetId: string) => void;
  handlePlayPause: () => void;
  handleTimeUpdate: (time: number) => void;
  handleDurationChange: (duration: number) => void;
  handleSeek: (time: number) => void;
  handleFormatChange: (format: EditorState['format']) => void;
  handleAddLayer: (type: LayerType) => void;
  handleAddLayerAtCoords: (type: Exclude<LayerType, 'audio'>, x: number, y: number) => void;
  handleUpdateLayer: (layer: EditorState['layers'][number]) => void;
  handleDeleteLayer: (id: string) => void;
  handleSelectLayer: (id: string | null) => void;
  handleLayerTimingChange: (id: string, startTime: number, endTime: number) => void;
  handleLayerOrderChange: (id: string, direction: 'front' | 'back') => void;
  handleLayerStackOrderChange: (id: string, targetIndex: number) => void;
  handleSelectClip: (id: string | null) => void;
  handleUpdateCanvasObject: (object: CanvasObject) => void;
  handleMoveClip: (id: string, timelineStart: number) => void;
  handleTrimClip: (id: string, edge: 'start' | 'end', sourceTime: number) => void;
  handleClipOrderChange: (id: string, targetIndex: number) => void;
  handleToggleClipMute: (id: string) => void;
  handleDeleteClip: (id: string) => void;
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
    currentTime: Number.isFinite(restoredDraft.currentTime) ? restoredDraft.currentTime : 0,
    trimStart: 0,
    trimEnd: restoredDraft.duration,
    subtitles: restoredDraft.subtitles,
    hasAudio: restoredDraft.hasAudio,
    audioMuted: restoredDraft.audioMuted ?? false,
    subtitleFontScale: restoredDraft.subtitleFontScale,
    subtitleFontFamily: restoredDraft.subtitleFontFamily,
    format: restoredDraft.format,
    layers: restoredDraft.layers,
    mediaAssets: restoredDraft.mediaAssets ?? [],
    timelineClips: restoredDraft.timelineClips ?? [],
    canvasObjects: restoredDraft.canvasObjects ?? [],
    selectedClipId: restoredDraft.selectedClipId ?? null,
    selectedCanvasObjectId: restoredDraft.selectedCanvasObjectId ?? null,
    uploadError: null,
    isUploadingMedia: false,
  } : initialState);
  const [title, setTitle] = useState(restoredDraft?.title ?? 'My Video Draft');
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeLanguage, setTranscribeLanguage] = useState<'en' | 'ur' | 'auto'>('en');
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const set = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const playback = usePlaybackControllers(state, set, videoRef);
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

  function calculateProjectDuration(nextClips: TimelineClip[], nextLayers = state.layers) {
    return Math.max(calculateTimelineDuration(nextClips), calculateLayerTimelineDuration(nextLayers));
  }

  function makeCanvasObject(asset: MediaAsset, clipId: string | null, drawOrder: number): CanvasObject {
    const canvasRatio = state.format === '9:16' ? 9 / 16 : state.format === '1:1' ? 1 : 16 / 9;
    const assetRatio = asset.width > 0 && asset.height > 0 ? asset.width / asset.height : canvasRatio;
    const width = assetRatio >= canvasRatio ? 72 : 42;
    const height = Math.max(12, Math.min(86, (width * canvasRatio) / assetRatio));
    return {
      id: crypto.randomUUID(),
      assetId: asset.id,
      clipId: clipId ?? undefined,
      type: asset.type,
      x: Math.max(0, (100 - width) / 2),
      y: Math.max(0, (100 - height) / 2),
      width,
      height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      selected: true,
      drawOrder,
    };
  }

  async function deployMediaFile(file: File, expectedType: 'video' | 'image') {
    if (!file.type.startsWith(`${expectedType}/`)) {
      set({ uploadError: `Choose a valid ${expectedType} file.` });
      return;
    }
    const temporaryId = crypto.randomUUID();
    const uploadingAsset: MediaAsset = {
      id: temporaryId,
      type: expectedType,
      url: '',
      originalFileName: file.name,
      width: 0,
      height: 0,
      duration: expectedType === 'video' ? 0 : undefined,
      status: 'uploading',
      createdAt: Date.now(),
      metadataLoaded: false,
    };
    setState((prev) => ({
      ...prev,
      mediaAssets: [...prev.mediaAssets, uploadingAsset],
      isUploadingMedia: true,
      uploadError: null,
    }));

    try {
      const uploaded = await uploadMediaFile(file);
      const metadata = uploaded.type === 'video'
        ? await loadVideoMetadata(uploaded.url)
        : await loadImageMetadata(uploaded.url);

      if (!metadata) {
        throw new Error(
          uploaded.type === 'video'
            ? 'Could not read the deployed video metadata.'
            : 'Could not read the deployed image dimensions.'
        );
      }

      const duration =
        uploaded.type === 'video' && 'duration' in metadata && typeof metadata.duration === 'number'
          ? metadata.duration
          : 5;
      if (uploaded.type === 'video' && (!Number.isFinite(duration) || duration <= 0)) {
        throw new Error('The uploaded video has no usable duration.');
      }

      setState((prev) => {
        const asset: MediaAsset = {
          id: uploaded.id,
          type: uploaded.type,
          url: uploaded.url,
          originalFileName: uploaded.originalFileName,
          width: metadata.width,
          height: metadata.height,
          duration,
          status: 'deployed',
          createdAt: Date.now(),
          metadataLoaded: true,
        };
        return {
          ...prev,
          videoFile: asset.type === 'video' ? file : prev.videoFile,
          videoUrl: prev.videoUrl,
          hasAudio: prev.hasAudio,
          mediaAssets: prev.mediaAssets.filter((item) => item.id !== temporaryId).concat(asset),
          uploadError: null,
          isUploadingMedia: false,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setState((prev) => ({
        ...prev,
        mediaAssets: prev.mediaAssets.map((asset) =>
          asset.id === temporaryId ? { ...asset, status: 'failed', error: message } : asset
        ),
        isUploadingMedia: false,
        uploadError: message,
      }));
    }
  }

  function handleVideoUpload(file: File) {
    setWaveformData(null);
    setIsTranscribing(false);
    setTranscribeStatus('');
    void deployMediaFile(file, 'video');
  }

  function handleImageUpload(file: File) {
    void deployMediaFile(file, 'image');
  }

function handlePlaceAsset(assetId: string) {
    const asset = state.mediaAssets.find((item) => item.id === assetId && item.status === 'deployed' && item.metadataLoaded);
    if (!asset) return;
    const duration = asset.type === 'video' ? asset.duration ?? 0 : asset.duration ?? 5;
    if (!Number.isFinite(duration) || duration <= 0) {
      set({ uploadError: 'This asset has no usable duration.' });
      return;
    }
    const clipId = crypto.randomUUID();
    const object = makeCanvasObject(asset, clipId, state.canvasObjects.length + state.layers.length + 1);
    const clipDuration = asset.type === 'video' ? duration : Math.max(1, duration);
    const nextTimelineStart = 0;
    const sourceEnd = asset.type === 'image' ? clipDuration : duration;
    const clip: TimelineClip = {
      id: clipId,
      assetId: asset.id,
      canvasObjectId: object.id,
      type: asset.type,
      timelineStart: nextTimelineStart,
      sourceStart: 0,
      sourceEnd,
      duration: clipDuration,
      muted: asset.type === 'video' ? false : true,
      volume: 1,
      selected: true,
    };
    const clips = [...state.timelineClips.map((item) => ({ ...item, selected: false })), clip];
    const timelineDuration = calculateProjectDuration(clips);
    set({
      videoUrl: asset.type === 'video' && !state.videoUrl ? asset.url : state.videoUrl,
      hasAudio: asset.type === 'video' ? true : state.hasAudio,
      timelineClips: clips,
      canvasObjects: state.canvasObjects.map((item) => ({ ...item, selected: false })).concat(object),
      selectedClipId: clip.id,
      selectedCanvasObjectId: object.id,
      selectedLayerId: null,
      duration: timelineDuration,
      currentTime: clip.timelineStart,
      uploadError: null,
    });
    if (asset.type === 'video') {
      extractWaveform(asset.url).then((data) => setWaveformData(data ?? null));
    }
  }

  function handleAddLayer(type: LayerType) {
    const newLayer = createDefaultLayer(type, state.layers.length);
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  function selectClip(id: string | null) {
    const clip = state.timelineClips.find((item) => item.id === id);
    set({
      selectedClipId: id,
      selectedCanvasObjectId: clip?.canvasObjectId ?? null,
      selectedLayerId: null,
      timelineClips: state.timelineClips.map((item) => ({ ...item, selected: item.id === id })),
      canvasObjects: state.canvasObjects.map((object) => ({ ...object, selected: object.id === clip?.canvasObjectId })),
    });
  }

  function handleSelectClip(id: string | null) {
    selectClip(id);
  }

  function handleUpdateCanvasObject(object: CanvasObject) {
    const safeObject = {
      ...object,
      x: Number.isFinite(object.x) ? object.x : 0,
      y: Number.isFinite(object.y) ? object.y : 0,
      width: Number.isFinite(object.width) ? Math.max(1, object.width) : 10,
      height: Number.isFinite(object.height) ? Math.max(1, object.height) : 10,
    };
    set({
      canvasObjects: state.canvasObjects.map((item) => (item.id === safeObject.id ? safeObject : item)),
    });
  }

  function commitClips(nextClips: TimelineClip[], patch: Partial<EditorState> = {}) {
    const timelineDuration = calculateProjectDuration(nextClips);
    set({
      ...patch,
      timelineClips: nextClips,
      duration: timelineDuration,
      currentTime: clampPlayhead(state.currentTime, timelineDuration),
    });
  }

  function handleMoveClip(id: string, timelineStart: number) {
    const nextClips = state.timelineClips.map((clip) => (clip.id === id ? moveClip(clip, timelineStart) : clip));
    commitClips(nextClips);
  }

  function handleTrimClip(id: string, edge: 'start' | 'end', sourceTime: number) {
    const target = state.timelineClips.find((clip) => clip.id === id);
    if (!target) return;
    const asset = state.mediaAssets.find((item) => item.id === target.assetId);
    const maxSourceEnd = asset?.type === 'video' && Number.isFinite(asset.duration)
      ? asset.duration
      : target.sourceEnd;
    const nextClips = state.timelineClips.map((clip) => {
      if (clip.id !== id) return clip;
      if (clip.type === 'image' && edge === 'end') return resizeImageClipEnd(clip, sourceTime);
      return edge === 'start'
        ? trimClipStart(clip, sourceTime)
        : trimClipEnd(clip, sourceTime, maxSourceEnd);
    });
    commitClips(nextClips, {
      selectedClipId: id,
      selectedCanvasObjectId: target.canvasObjectId,
      selectedLayerId: null,
    });
  }

  function handleToggleClipMute(id: string) {
    set({
      timelineClips: state.timelineClips.map((clip) => (clip.id === id ? { ...clip, muted: !clip.muted } : clip)),
    });
  }

  function handleDeleteClip(id: string) {
    const target = state.timelineClips.find((clip) => clip.id === id);
    const nextClips = state.timelineClips.filter((clip) => clip.id !== id);
    const timelineDuration = calculateProjectDuration(nextClips);
    set({
      timelineClips: nextClips,
      canvasObjects: target
        ? state.canvasObjects.filter((object) => object.id !== target.canvasObjectId)
        : state.canvasObjects,
      selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
      selectedCanvasObjectId: target?.canvasObjectId === state.selectedCanvasObjectId ? null : state.selectedCanvasObjectId,
      duration: timelineDuration,
      currentTime: clampPlayhead(state.currentTime, timelineDuration),
      isPlaying: timelineDuration > 0 ? state.isPlaying : false,
    });
  }

  function handleClipOrderChange(id: string, targetIndex: number) {
    const moved = state.timelineClips.find((clip) => clip.id === id);
    const reordered = reorderTimelineStack(
      'clip',
      id,
      targetIndex,
      state.layers,
      state.timelineClips,
      state.canvasObjects
    );
    if (!moved || !reordered) return;

    set({
      layers: reordered.layers,
      canvasObjects: reordered.canvasObjects,
      selectedClipId: id,
      selectedCanvasObjectId: moved.canvasObjectId,
    });
  }

  return {
    state,
    title,
    setTitle,
    waveformData,
    isTranscribing,
    transcribeStatus,
    transcribeLanguage,
    showPreview,
    setShowPreview,
    videoRef,
    set,
    handleVideoUpload,
    handleImageUpload,
    handlePlaceAsset,
    handlePlayPause: playback.handlePlayPause,
    handleTimeUpdate: playback.handleTimeUpdate,
    handleDurationChange: playback.handleDurationChange,
    handleSeek: playback.handleSeek,
    handleFormatChange: playback.handleFormatChange,
    handleAddLayer,
    handleAddLayerAtCoords: layers.handleAddLayerAtCoords,
    handleUpdateLayer: layers.handleUpdateLayer,
    handleDeleteLayer: layers.handleDeleteLayer,
    handleSelectLayer: layers.handleSelectLayer,
    handleLayerTimingChange: layers.handleLayerTimingChange,
    handleLayerOrderChange: layers.handleLayerOrderChange,
    handleLayerStackOrderChange: layers.handleLayerStackOrderChange,
    handleSelectClip,
    handleUpdateCanvasObject,
    handleMoveClip,
    handleTrimClip,
    handleClipOrderChange,
    handleToggleClipMute,
    handleDeleteClip,
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
