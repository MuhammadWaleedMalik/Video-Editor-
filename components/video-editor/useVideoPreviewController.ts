import { Layer, LayerType, SubtitleChunk, VideoFormat } from '@/types/editor';
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
  layers: Layer[];
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
