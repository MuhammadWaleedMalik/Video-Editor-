import { Layer, LayerType, SubtitleChunk, VideoFormat } from '@/types/editor';

export type LayerDragAction = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

export interface PreviewCanvasController {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewportRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  stageSize: { width: number; height: number };
  editingTextId: string | null;
  containerStyle: React.CSSProperties;
  setEditingTextId: (id: string | null) => void;
  measureCanvas: () => void;
  drawFrame: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleContainerClick: (e: React.MouseEvent) => void;
  handleTextChange: (id: string, text: string) => void;
  handleLayerMouseDown: (
    e: React.MouseEvent,
    layer: Layer,
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
  layers: Layer[];
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
