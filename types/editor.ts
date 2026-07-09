export type VideoFormat = '16:9' | '9:16' | '1:1';

// src/types/editor.ts

export type SubtitleChunk = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
};

export type LayerType = 'image' | 'video' | 'text' | 'audio';
export type MediaAssetType = 'video' | 'image' | 'audio';
export type TimelineClipType = 'video' | 'image';
export type MediaAssetStatus = 'uploading' | 'deployed' | 'failed';
export type CanvasObjectType = 'video' | 'image' | 'text' | 'shape';

export interface TextAsset {
  id: string;
  type: 'text';
  name: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bgColor: string;
  themeId?: string;
  createdAt: number;
}

export interface MediaAsset {
  id: string;
  type: MediaAssetType;
  url: string;
  originalFileName: string;
  width: number;
  height: number;
  duration?: number;
  status: MediaAssetStatus;
  createdAt: number;
  metadataLoaded: boolean;
  error?: string;
}

export interface TimelineClip {
  id: string;
  assetId: string;
  canvasObjectId: string;
  type: TimelineClipType;
  timelineStart: number;
  sourceStart: number;
  sourceEnd: number;
  duration: number;
  muted: boolean;
  volume: number;
  selected: boolean;
  locked?: boolean;
  hidden?: boolean;
  timelineGroupId?: string;
}

export interface CanvasObject {
  id: string;
  assetId?: string;
  clipId?: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  selected: boolean;
  drawOrder: number;
}

export interface Layer {
  id: string;
  assetId?: string;
  type: LayerType;
  x: number;          // percent (0-100)
  y: number;          // percent (0-100)
  width: number;      // percent (0-100)
  height: number;     // percent (0-100)
  zIndex: number;
  name: string;
  startTime: number;
  endTime: number;
  text?: string;
  fontSize?: number;  // px
  fontFamily?: string; // CSS font stack
  color?: string;     // color hex
  bgColor?: string;   // bgColor hex
  themeId?: string;   // optional reusable text theme id
  src?: string;       // URL (object URL or placeholder)
  mediaMuted?: boolean; // Video layer mute state
  mediaStart?: number; // Source offset for trimmed/split media layers
  mediaEnd?: number;
  timelineGroupId?: string;
}

export interface EditorState {
  videoFile: File | null;
  videoUrl: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  trimStart: number;
  trimEnd: number;
  subtitles: SubtitleChunk[];
  hasAudio: boolean;
  audioMuted: boolean;
  format: VideoFormat;
  playbackRate: number;
  subtitleFontScale: number;
  subtitleFontFamily: string;
  layers: Layer[];
  selectedLayerId: string | null;
  mediaAssets: MediaAsset[];
  textAssets: TextAsset[];
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedClipId: string | null;
  selectedCanvasObjectId: string | null;
  uploadError: string | null;
  isUploadingMedia: boolean;
}
