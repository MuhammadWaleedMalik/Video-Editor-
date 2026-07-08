import { CanvasObject, Layer, LayerType, MediaAsset, SubtitleChunk, TimelineClip, VideoFormat } from '@/types/editor';
import { useVideoCanvasController } from './videoPreviewCanvas';

interface UseVideoPreviewControllerProps {
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

export interface VideoPreviewController {
  refs: ReturnType<typeof useVideoCanvasController>;
}

export function useVideoPreviewController(args: UseVideoPreviewControllerProps): VideoPreviewController {
  const refs = useVideoCanvasController(args);
  return { refs };
}
