import { CanvasObject, EditorState, Layer, MediaAsset, SubtitleChunk, TimelineClip } from '@/types/editor';

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
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedClipId: string | null;
  selectedCanvasObjectId: string | null;
  videoFileName: string | null;
  videoUrl: string | null;
  videoSourceHint: string | null;
}

export const IMPORTED_DRAFT_KEY = 'cvvid-imported-draft';

export function buildEditorDraft(state: EditorState, title: string): EditorDraftPayload {
  return {
    title,
    format: state.format,
    duration: state.duration,
    currentTime: state.currentTime,
    trimStart: state.trimStart,
    trimEnd: state.trimEnd,
    subtitles: state.subtitles,
    hasAudio: state.hasAudio,
    audioMuted: state.audioMuted,
    subtitleFontScale: state.subtitleFontScale,
    subtitleFontFamily: state.subtitleFontFamily,
    layers: state.layers.map((layer) => ({ ...layer })),
    mediaAssets: state.mediaAssets.map((asset) => ({ ...asset })),
    timelineClips: state.timelineClips.map((clip) => ({ ...clip })),
    canvasObjects: state.canvasObjects.map((object) => ({ ...object })),
    selectedClipId: state.selectedClipId,
    selectedCanvasObjectId: state.selectedCanvasObjectId,
    videoFileName: state.videoFile?.name ?? null,
    videoUrl: state.videoUrl,
    videoSourceHint: state.videoUrl ? 'blob-source' : null,
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
