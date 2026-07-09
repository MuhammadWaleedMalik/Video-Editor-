import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasObject, EditorState, LayerType, MediaAsset, MediaAssetType, TimelineClip, TimelineClipType } from '@/types/editor';
import { createBlobUrl, getMediaDuration, loadImageMetadata, loadVideoMetadata, revokeBlobUrl, uploadMediaFile } from '@/lib/videoAssets';
import {
  DEFAULT_TEXT_ASSET,
  createDefaultTextAsset,
  createDefaultLayer,
  createLayerFromTextAsset,
  extractWaveform,
  initialState,
} from './videoEditorDefaults';
import { usePlaybackControllers } from './videoEditorPlayback';
import { useLayerControllers } from './videoEditorLayers';
import { useSubtitleControllers } from './videoEditorSubtitles';
import { loadEditorDraft } from '@/lib/editorDraft';
import {
  calculateTimelineDuration,
  calculateLayerTimelineDuration,
  clampLayerTiming,
  clampPlayhead,
  clampProjectDuration,
  clampTimelineStartForDuration,
  canSplitClip,
  fitClipToTimeline,
  MAX_TIMELINE_DURATION_SECONDS,
  moveClip,
  reorderTimelineStack,
  resizeImageClipEnd,
  splitClipAtMidpoint,
  toggleClipMute,
  trimClipEnd,
  trimClipStart,
} from './timelineModel';

function isVisualMediaAsset(asset: MediaAsset): asset is MediaAsset & { type: TimelineClipType } {
  return asset.type === 'video' || asset.type === 'image';
}

function formatDurationLimit() {
  return `${MAX_TIMELINE_DURATION_SECONDS}s (3 minutes)`;
}

function clampCanvasObjectRect(object: CanvasObject): CanvasObject {
  const width = Number.isFinite(object.width) ? Math.max(2, Math.min(100, object.width)) : 10;
  const height = Number.isFinite(object.height) ? Math.max(2, Math.min(100, object.height)) : 10;
  const x = Number.isFinite(object.x) ? Math.max(0, Math.min(100 - width, object.x)) : 0;
  const y = Number.isFinite(object.y) ? Math.max(0, Math.min(100 - height, object.y)) : 0;
  return { ...object, x, y, width, height };
}

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
  handleAudioUpload: (file: File) => void;
  handlePlaceAsset: (assetId: string) => void;
  handleDeleteAsset: (id: string) => void;
  handlePlaceTextAsset: (assetId: string) => void;
  handleDeleteTextAsset: (id: string) => void;
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
  handleSplitLayer: (id: string) => void;
  handleToggleLayerMute: (id: string) => void;
  handleLayerOrderChange: (id: string, direction: 'front' | 'back') => void;
  handleLayerStackOrderChange: (id: string, targetIndex: number) => void;
  handleSelectClip: (id: string | null) => void;
  handleUpdateCanvasObject: (object: CanvasObject) => void;
  handleMoveClip: (id: string, timelineStart: number) => void;
  handleTrimClip: (id: string, edge: 'start' | 'end', sourceTime: number) => void;
  handleSplitClip: (id: string) => void;
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
  const [state, setState] = useState<EditorState>(initialState);
  const [title, setTitle] = useState('My Video Draft');
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeLanguage, setTranscribeLanguage] = useState<'en' | 'ur' | 'auto'>('en');
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const set = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    const restoredDraft = loadEditorDraft();
    if (!restoredDraft) return;

    const restoredClips = (restoredDraft.timelineClips ?? []).map(fitClipToTimeline);
    const restoredLayers = (restoredDraft.layers ?? []).map(clampLayerTiming);
    const restoredDuration = Math.max(
      calculateTimelineDuration(restoredClips),
      calculateLayerTimelineDuration(restoredLayers)
    );

    setTitle(restoredDraft.title ?? 'My Video Draft');
    setState({
      ...initialState,
      videoUrl: restoredDraft.videoUrl,
      duration: restoredDuration,
      currentTime: clampPlayhead(
        Number.isFinite(restoredDraft.currentTime) ? restoredDraft.currentTime : 0,
        restoredDuration
      ),
      trimStart: restoredDraft.trimStart ?? 0,
      trimEnd: clampProjectDuration(restoredDraft.trimEnd || restoredDuration),
      subtitles: restoredDraft.subtitles,
      hasAudio: restoredDraft.hasAudio,
      audioMuted: restoredDraft.audioMuted ?? false,
      subtitleFontScale: restoredDraft.subtitleFontScale,
      subtitleFontFamily: restoredDraft.subtitleFontFamily,
      format: restoredDraft.format,
      layers: restoredLayers,
      mediaAssets: restoredDraft.mediaAssets ?? [],
      textAssets: restoredDraft.textAssets?.length ? restoredDraft.textAssets : [DEFAULT_TEXT_ASSET],
      timelineClips: restoredClips,
      canvasObjects: (restoredDraft.canvasObjects ?? []).map(clampCanvasObjectRect),
      selectedClipId: restoredDraft.selectedClipId ?? null,
      selectedCanvasObjectId: restoredDraft.selectedCanvasObjectId ?? null,
      uploadError: null,
      isUploadingMedia: false,
    });
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

  function makeCanvasObject(asset: MediaAsset & { type: TimelineClipType }, clipId: string | null, drawOrder: number): CanvasObject {
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

  async function deployMediaFile(file: File, expectedType: MediaAssetType) {
    if (!file.type.startsWith(`${expectedType}/`)) {
      set({ uploadError: `Choose a valid ${expectedType} file.` });
      return;
    }
    if (expectedType === 'video' || expectedType === 'audio') {
      const localUrl = createBlobUrl(file);
      try {
        const duration = expectedType === 'video'
          ? (await loadVideoMetadata(localUrl))?.duration
          : await getMediaDuration(localUrl, 'audio');
        if (!Number.isFinite(duration) || !duration || duration <= 0) {
          set({ uploadError: `Could not read the selected ${expectedType} metadata.` });
          return;
        }
        if (duration > MAX_TIMELINE_DURATION_SECONDS) {
          set({
            uploadError: `${expectedType === 'video' ? 'Video' : 'Audio'} is ${Math.ceil(duration)}s long. Maximum ${expectedType} length is ${formatDurationLimit()}.`,
          });
          return;
        }
      } finally {
        revokeBlobUrl(localUrl);
      }
    }

    const temporaryId = crypto.randomUUID();
    const uploadingAsset: MediaAsset = {
      id: temporaryId,
      type: expectedType,
      url: '',
      originalFileName: file.name,
      width: 0,
      height: 0,
      duration: expectedType === 'video' || expectedType === 'audio' ? 0 : undefined,
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
      if (uploaded.type !== expectedType) {
        throw new Error(`Uploaded file was not recognized as ${expectedType}.`);
      }

      let width = 0;
      let height = 0;
      let duration: number | undefined = uploaded.type === 'image' ? 5 : 0;

      if (uploaded.type === 'video') {
        const metadata = await loadVideoMetadata(uploaded.url);
        if (!metadata) throw new Error('Could not read the deployed video metadata.');
        width = metadata.width;
        height = metadata.height;
        duration = metadata.duration;
      } else if (uploaded.type === 'image') {
        const metadata = await loadImageMetadata(uploaded.url);
        if (!metadata) throw new Error('Could not read the deployed image dimensions.');
        width = metadata.width;
        height = metadata.height;
      } else {
        duration = await getMediaDuration(uploaded.url, 'audio') ?? 0;
      }

      if ((uploaded.type === 'video' || uploaded.type === 'audio') && (!Number.isFinite(duration) || duration <= 0)) {
        throw new Error(`The uploaded ${uploaded.type} has no usable duration.`);
      }
      if ((uploaded.type === 'video' || uploaded.type === 'audio') && duration > MAX_TIMELINE_DURATION_SECONDS) {
        throw new Error(`${uploaded.type === 'video' ? 'Video' : 'Audio'} is ${Math.ceil(duration)}s long. Maximum ${uploaded.type} length is ${formatDurationLimit()}.`);
      }

      setState((prev) => {
        const asset: MediaAsset = {
          id: uploaded.id,
          type: uploaded.type,
          url: uploaded.url,
          originalFileName: uploaded.originalFileName,
          width,
          height,
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

  function handleAudioUpload(file: File) {
    void deployMediaFile(file, 'audio');
  }

  function handlePlaceAsset(assetId: string) {
    const asset = state.mediaAssets.find((item) => item.id === assetId && item.status === 'deployed' && item.metadataLoaded);
    if (!asset) return;
    const duration = asset.type === 'video' ? asset.duration ?? 0 : asset.duration ?? 5;
    if (!Number.isFinite(duration) || duration <= 0) {
      set({ uploadError: 'This asset has no usable duration.' });
      return;
    }
    if ((asset.type === 'video' || asset.type === 'audio') && duration > MAX_TIMELINE_DURATION_SECONDS) {
      set({
        uploadError: `${asset.type === 'video' ? 'Video' : 'Audio'} is ${Math.ceil(duration)}s long. Maximum ${asset.type} length is ${formatDurationLimit()}.`,
      });
      return;
    }
    if (asset.type === 'audio') {
      const newLayer = createDefaultLayer('audio', state.layers.length);
      const nextLayer = clampLayerTiming({
        ...newLayer,
        assetId: asset.id,
        name: asset.originalFileName,
        src: asset.url,
        endTime: duration,
        mediaMuted: false,
        mediaStart: 0,
        mediaEnd: duration,
        timelineGroupId: newLayer.id,
      });
      const nextLayers = [...state.layers, nextLayer];
      const timelineDuration = calculateProjectDuration(state.timelineClips, nextLayers);
      set({
        layers: nextLayers,
        selectedLayerId: nextLayer.id,
        selectedClipId: null,
        selectedCanvasObjectId: null,
        duration: timelineDuration,
        currentTime: nextLayer.startTime,
        hasAudio: true,
        uploadError: null,
      });
      return;
    }
    if (!isVisualMediaAsset(asset)) return;
    const clipId = crypto.randomUUID();
    const object = makeCanvasObject(asset, clipId, state.canvasObjects.length + state.layers.length + 1);
    const clipDuration = Math.min(asset.type === 'video' ? duration : Math.max(1, duration), MAX_TIMELINE_DURATION_SECONDS);
    const nextTimelineStart = 0;
    const sourceEnd = asset.type === 'image' ? clipDuration : duration;
    const clip: TimelineClip = fitClipToTimeline({
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
      timelineGroupId: clipId,
    });
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

  function handlePlaceTextAsset(assetId: string) {
    const asset = state.textAssets.find((item) => item.id === assetId);
    if (!asset) return;

    const nextLayer = clampLayerTiming(createLayerFromTextAsset(asset, state.layers.length));
    const nextLayers = [...state.layers, nextLayer];
    const timelineDuration = calculateProjectDuration(state.timelineClips, nextLayers);
    set({
      layers: nextLayers,
      selectedLayerId: nextLayer.id,
      selectedClipId: null,
      selectedCanvasObjectId: null,
      duration: timelineDuration,
      currentTime: nextLayer.startTime,
      uploadError: null,
    });
  }

  function handleDeleteTextAsset(id: string) {
    const usedInTimeline = state.layers.some((layer) => layer.type === 'text' && layer.assetId === id);

    if (usedInTimeline) {
      set({ uploadError: 'Remove this text from the timeline first, then delete it from the sidebar.' });
      return;
    }

    set({
      textAssets: state.textAssets.filter((asset) => asset.id !== id),
      uploadError: null,
    });
  }

  function handleDeleteAsset(id: string) {
    const usedInTimeline =
      state.timelineClips.some((clip) => clip.assetId === id) ||
      state.layers.some((layer) => layer.assetId === id);

    if (usedInTimeline) {
      set({ uploadError: 'Remove this media from the timeline first, then delete it from the sidebar.' });
      return;
    }

    set({
      mediaAssets: state.mediaAssets.filter((asset) => asset.id !== id),
      uploadError: null,
    });
  }

  function handleAddLayer(type: LayerType) {
    if (type === 'text') {
      const textAsset = createDefaultTextAsset(state.textAssets.length);
      set({
        textAssets: [...state.textAssets, textAsset],
        uploadError: null,
      });
      return;
    }

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
    const safeObject = clampCanvasObjectRect(object);
    set({
      canvasObjects: state.canvasObjects.map((item) => (item.id === safeObject.id ? safeObject : item)),
    });
  }

  function commitClips(nextClips: TimelineClip[], patch: Partial<EditorState> = {}) {
    const safeClips = nextClips.map(fitClipToTimeline);
    const timelineDuration = calculateProjectDuration(safeClips);
    set({
      ...patch,
      timelineClips: safeClips,
      duration: timelineDuration,
      currentTime: clampPlayhead(state.currentTime, timelineDuration),
    });
  }

  function handleMoveClip(id: string, timelineStart: number) {
    const nextClips = state.timelineClips.map((clip) =>
      clip.id === id ? fitClipToTimeline(moveClip(clip, clampTimelineStartForDuration(timelineStart, clip.duration))) : clip
    );
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

  function handleSplitClip(id: string) {
    const target = state.timelineClips.find((clip) => clip.id === id);
    if (!target) return;

    if (!canSplitClip(target)) {
      set({ uploadError: 'This video clip must be at least 6s long to split into two 3s parts.' });
      return;
    }

    const sourceObject = state.canvasObjects.find((object) => object.id === target.canvasObjectId);
    if (!sourceObject) {
      set({ uploadError: 'Could not find the canvas object for this clip.' });
      return;
    }

    const secondClipId = crypto.randomUUID();
    const secondCanvasObjectId = crypto.randomUUID();
    const splitClips = splitClipAtMidpoint(target, secondClipId, secondCanvasObjectId);
    if (!splitClips) {
      set({ uploadError: 'This video clip is too short to split.' });
      return;
    }

    const [firstClip, secondClip] = splitClips;
    const maxDrawOrder = Math.max(0, ...state.canvasObjects.map((object) => object.drawOrder));
    const secondObject: CanvasObject = {
      ...sourceObject,
      id: secondCanvasObjectId,
      clipId: secondClipId,
      selected: true,
      drawOrder: maxDrawOrder + 1,
    };
    const nextClips = state.timelineClips.flatMap((clip) => {
      if (clip.id !== id) return { ...clip, selected: false };
      return [firstClip, secondClip];
    });
    const nextObjects = state.canvasObjects
      .map((object) => (
        object.id === sourceObject.id
          ? { ...object, clipId: firstClip.id, selected: false }
          : { ...object, selected: false }
      ))
      .concat(secondObject);
    const timelineDuration = calculateProjectDuration(nextClips);

    set({
      timelineClips: nextClips.map(fitClipToTimeline),
      canvasObjects: nextObjects,
      selectedClipId: secondClipId,
      selectedCanvasObjectId: secondCanvasObjectId,
      selectedLayerId: null,
      duration: timelineDuration,
      currentTime: secondClip.timelineStart,
      uploadError: null,
    });
  }

  function handleToggleClipMute(id: string) {
    set({
      timelineClips: toggleClipMute(state.timelineClips, id),
    });
  }

  function handleDeleteClip(id: string) {
    const target = state.timelineClips.find((clip) => clip.id === id);
    const nextClips = state.timelineClips.filter((clip) => clip.id !== id);
    const siblingClip = target ? nextClips.find((clip) => clip.canvasObjectId === target.canvasObjectId) : null;
    const timelineDuration = calculateProjectDuration(nextClips);
    const nextSelectedClipId = state.selectedClipId === id ? siblingClip?.id ?? null : state.selectedClipId;
    const nextSelectedCanvasObjectId = state.selectedClipId === id && target && siblingClip
      ? target.canvasObjectId
      : target?.canvasObjectId === state.selectedCanvasObjectId && !siblingClip
        ? null
        : state.selectedCanvasObjectId;
    set({
      timelineClips: nextClips,
      canvasObjects: target
        ? state.canvasObjects
          .filter((object) => object.id !== target.canvasObjectId || Boolean(siblingClip))
          .map((object) => (
            object.id === target.canvasObjectId && siblingClip
              ? { ...object, clipId: siblingClip.id, selected: object.id === nextSelectedCanvasObjectId }
              : object
          ))
        : state.canvasObjects,
      selectedClipId: nextSelectedClipId,
      selectedCanvasObjectId: nextSelectedCanvasObjectId,
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
    handleAudioUpload,
    handlePlaceAsset,
    handleDeleteAsset,
    handlePlaceTextAsset,
    handleDeleteTextAsset,
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
    handleSplitLayer: layers.handleSplitLayer,
    handleToggleLayerMute: layers.handleToggleLayerMute,
    handleLayerOrderChange: layers.handleLayerOrderChange,
    handleLayerStackOrderChange: layers.handleLayerStackOrderChange,
    handleSelectClip,
    handleUpdateCanvasObject,
    handleMoveClip,
    handleTrimClip,
    handleSplitClip,
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
