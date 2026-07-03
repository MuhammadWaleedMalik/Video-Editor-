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

export interface ImageLayer {
  id: string;
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  zIndex: number;
  startTime: number;
  endTime: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  scale: number;
  rotation: number;
}

export interface AudioLayer {
  id: string;
  type: 'audio';
  src: string;
  volume: number;
  startTime: number;
  endTime: number;
  zIndex: number;
}

export interface TextLayer {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  opacity: number;
  zIndex: number;
  startTime: number;
  endTime: number;
  backgroundColor: string;
  backgroundOpacity: number;
  padding: number;
  borderRadius: number;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold' | '900';
}

export type Layer = ImageLayer | AudioLayer | TextLayer;

export interface TrimSegment {
  id: string;
  startTime: number;
  endTime: number;
  trackType: 'video' | 'audio' | 'both';
}

export interface VideoTrack {
  id: string;
  file: File | null;
  url: string | null;
  duration: number;
  hasAudio: boolean;
}

export interface AudioTrack {
  id: string;
  url: string | null;
  duration: number;
  volume: number;
  muted: boolean;
}

export interface EditorState {
  videoFile: File | null;
  videoUrl: string | null;
  audioUrl: string | null;
  audioBlob: Blob | null;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  trimStart: number;
  trimEnd: number;
  trimSegments: TrimSegment[];
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
