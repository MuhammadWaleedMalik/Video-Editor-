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
  canvasCursor: string;
  onEditStart: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onUpdateLayer: (layer: Layer) => void;
  onLayerMouseDown: (
    e: React.PointerEvent,
    layer: Layer,
    action: 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
  ) => void;
  onCanvasPointerMove: (e: React.PointerEvent) => void;
  onCanvasPointerLeave: () => void;
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
  canvasCursor,
  onEditStart,
  onTextChange,
  onUpdateLayer,
  onLayerMouseDown,
  onCanvasPointerMove,
  onCanvasPointerLeave,
  containerStyle,
}: VideoCanvasStageProps) {
  return (
    <div ref={viewportRef} className="flex min-h-[260px] flex-1 items-center justify-center overflow-hidden sm:min-h-[340px]">
      <div
        ref={containerRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="group relative shrink-0 touch-none overflow-hidden rounded-xl border-2 border-[#d9c316] bg-black shadow-[0_18px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.9)]"
        style={containerStyle}
      >
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[10px] ring-1 ring-inset ring-white/20" />
        <canvas
          ref={canvasRef}
          className="block touch-none"
          style={{ width: '100%', height: '100%', cursor: canvasCursor }}
          onPointerDown={onContainerClick}
          onPointerMove={onCanvasPointerMove}
          onPointerLeave={onCanvasPointerLeave}
        />

      </div>
    </div>
  );
}
