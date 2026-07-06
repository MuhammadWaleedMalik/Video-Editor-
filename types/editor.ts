export type VideoFormat = '16:9' | '9:16' | '1:1';

export interface SubtitleChunk {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export type LayerType = 'image' | 'video' | 'text' | 'audio';

export interface Layer {
  id: string;
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
}

