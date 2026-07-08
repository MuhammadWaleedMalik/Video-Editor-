import { CanvasObject, EditorState, Layer, MediaAsset, SubtitleChunk, TextAsset, TimelineClip } from '@/types/editor';

export interface EditorDraftPayload {
  title: string;
  format: EditorState['format'];
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  subtitles: SubtitleChunk[];
  hasAudio: boolean;
  audioMuted: boolean;
  subtitleFontScale: number;
  subtitleFontFamily: string;
  layers: Layer[];
  mediaAssets: MediaAsset[];
  textAssets?: TextAsset[];
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedClipId: string | null;
  selectedCanvasObjectId: string | null;
  videoFileName: string | null;
  videoUrl: string | null;
  videoSourceHint: string | null;
}

export const IMPORTED_DRAFT_KEY = 'cvvid-imported-draft';

export function buildEditorDraft(
  state: EditorState,
  title: string,
  overrides: Partial<Pick<
    EditorDraftPayload,
    'currentTime' | 'duration' | 'trimStart' | 'trimEnd' | 'videoFileName' | 'videoUrl' | 'videoSourceHint'
  >> = {}
): EditorDraftPayload {
  return {
    title,
    format: state.format,
    duration: overrides.duration ?? state.duration,
    currentTime: overrides.currentTime ?? state.currentTime,
    trimStart: overrides.trimStart ?? state.trimStart,
    trimEnd: overrides.trimEnd ?? state.trimEnd,
    subtitles: state.subtitles,
    hasAudio: state.hasAudio,
    audioMuted: state.audioMuted,
    subtitleFontScale: state.subtitleFontScale,
    subtitleFontFamily: state.subtitleFontFamily,
    layers: state.layers.map((layer) => ({ ...layer })),
    mediaAssets: state.mediaAssets.map((asset) => ({ ...asset })),
    textAssets: state.textAssets.map((asset) => ({ ...asset })),
    timelineClips: state.timelineClips.map((clip) => ({ ...clip })),
    canvasObjects: state.canvasObjects.map((object) => ({ ...object })),
    selectedClipId: state.selectedClipId,
    selectedCanvasObjectId: state.selectedCanvasObjectId,
    videoFileName: overrides.videoFileName ?? state.videoFile?.name ?? null,
    videoUrl: overrides.videoUrl ?? state.videoUrl,
    videoSourceHint: overrides.videoSourceHint ?? (state.videoUrl ? 'blob-source' : null),
  };
}

export function saveEditorDraft(draft: EditorDraftPayload) {
  sessionStorage.setItem(IMPORTED_DRAFT_KEY, JSON.stringify(draft));
}

export function loadEditorDraft(): EditorDraftPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(IMPORTED_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorDraftPayload;
  } catch {
    return null;
  }
}

export function clearEditorDraft() {
  sessionStorage.removeItem(IMPORTED_DRAFT_KEY);
}
