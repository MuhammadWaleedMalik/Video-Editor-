export type VideoFormat = '16:9' | '9:16' | '1:1';

export interface SubtitleChunk {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface SplitPoint {
  id: string;
  time: number;
  type: 'manual' | 'smart';
}

export interface SmartTrimSegment {
  id: string;
  startTime: number;
  endTime: number;
  keep: boolean; // false = detected silence/filler
}

export interface Layer {
  id: string;
  type: 'image' | 'video' | 'text';
  x: number;          // percent (0-100)
  y: number;          // percent (0-100)
  width: number;      // percent (0-100)
  height: number;     // percent (0-100)
  zIndex: number;
  name: string;
  text?: string;
  fontSize?: number;  // px
  color?: string;     // color hex
  bgColor?: string;   // bgColor hex
  src?: string;       // URL (object URL or placeholder)
}

export interface EditorState {
  videoFile: File | null;
  videoUrl: string | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  trimStart: number;
  trimEnd: number;
  splitPoints: SplitPoint[];
  subtitles: SubtitleChunk[];
  hasAudio: boolean;
  audioMuted: boolean;
  bgBlurEnabled: boolean;
  activePanel: 'ai' | 'teleprompter';
  format: VideoFormat;
  noiseRemoveApplied: boolean;
  smartTrimSegments: SmartTrimSegment[];
  layers: Layer[];
  selectedLayerId: string | null;
}

