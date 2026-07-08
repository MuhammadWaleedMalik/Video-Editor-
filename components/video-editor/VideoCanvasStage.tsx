import { Layer } from '@/types/editor';

interface VideoCanvasStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewportRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  layers: Layer[];
  currentTime: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onDrop: (e: React.DragEvent) => void;
  onContainerClick: (e: React.PointerEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onSelectLayer: (id: string | null) => void;
  selectedLayerId: string | null;
  editingTextId: string | null;
  onEditStart: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onUpdateLayer: (layer: Layer) => void;
  onLayerMouseDown: (
    e: React.PointerEvent,
    layer: Layer,
    action: 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
  ) => void;
  containerStyle: React.CSSProperties;
}

export default function VideoCanvasStage({
  canvasRef,
  viewportRef,
  containerRef,
  layers,
  currentTime,
  isPlaying,
  onPlayPause,
  onDrop,
  onContainerClick,
  onDragOver,
  onSelectLayer,
  selectedLayerId,
  editingTextId,
  onEditStart,
  onTextChange,
  onUpdateLayer,
  onLayerMouseDown,
  containerStyle,
}: VideoCanvasStageProps) {
  return (
    <div ref={viewportRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <div
        ref={containerRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="group relative shrink-0 touch-none overflow-hidden rounded-xl bg-black shadow-[0_18px_80px_rgba(0,0,0,0.45)]"
        style={containerStyle}
      >
        <canvas
          ref={canvasRef}
          className="block cursor-move touch-none"
          style={{ width: '100%', height: '100%' }}
          onPointerDown={onContainerClick}
        />

      </div>
    </div>
  );
}
