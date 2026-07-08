import { CanvasObject, Layer, LayerType, MediaAsset, SubtitleChunk, TimelineClip, VideoFormat } from '@/types/editor';

export type LayerDragAction = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

export interface PreviewCanvasController {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewportRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  stageSize: { width: number; height: number };
  editingTextId: string | null;
  canvasCursor: string;
  containerStyle: React.CSSProperties;
  setEditingTextId: (id: string | null) => void;
  measureCanvas: () => void;
  drawFrame: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleContainerClick: (e: React.PointerEvent) => void;
  handleCanvasPointerMove: (e: React.PointerEvent) => void;
  handleCanvasPointerLeave: () => void;
  handleTextChange: (id: string, text: string) => void;
  handleLayerMouseDown: (
    e: React.PointerEvent,
    layer: Layer | CanvasObject,
    action: LayerDragAction
  ) => void;
}

export interface UseVideoCanvasControllerArgs {
  videoRef: React.RefObject<HTMLVideoElement>;
  isPlaying: boolean;
  subtitles: SubtitleChunk[];
  format: VideoFormat;
  subtitleFontScale: number;
  subtitleFontFamily: string;
  onUpdateLayer: (layer: Layer) => void;
  onAddLayerAtCoords: (type: Exclude<LayerType, 'audio'>, x: number, y: number) => void;
  onSelectLayer: (id: string | null) => void;
  onSelectClip: (id: string | null) => void;
  layers: Layer[];
  mediaAssets: MediaAsset[];
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedLayerId: string | null;
  selectedClipId: string | null;
  selectedCanvasObjectId: string | null;
  currentTime: number;
  onUpdateCanvasObject: (object: CanvasObject) => void;
  audioMuted: boolean;
  playbackRate: number;
}

export interface LayerDragState {
  containerW: number;
  containerH: number;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}
