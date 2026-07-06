import { EditorState, Layer, SubtitleChunk } from '@/types/editor';

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
  layers: Layer[];
  videoFileName: string | null;
  videoSourceHint: string | null;
}

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
    layers: state.layers.map((layer) => ({ ...layer })),
    videoFileName: state.videoFile?.name ?? null,
    videoSourceHint: state.videoUrl ? 'blob-source' : null,
  };
}
