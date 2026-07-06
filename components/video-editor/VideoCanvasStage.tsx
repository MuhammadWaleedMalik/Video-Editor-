import { Play, Pause } from 'lucide-react';
import { Layer } from '@/types/editor';
import VideoLayerItem from './VideoLayerItem';

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
  onContainerClick: (e: React.MouseEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onSelectLayer: (id: string | null) => void;
  selectedLayerId: string | null;
  editingTextId: string | null;
  onEditStart: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onUpdateLayer: (layer: Layer) => void;
  onLayerMouseDown: (
    e: React.MouseEvent,
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
        onClick={onContainerClick}
        className="group relative w-full max-w-full max-h-full overflow-hidden rounded-xl bg-black shadow-[0_18px_80px_rgba(0,0,0,0.45)]"
        style={containerStyle}
      >
        <canvas
          ref={canvasRef}
          className="block object-contain pointer-events-none"
          style={{ width: '100%', height: '100%' }}
        />

        {layers
          .filter((layer) => layer.type !== 'audio')
          .filter((layer) => currentTime >= layer.startTime && currentTime <= layer.endTime)
          .map((layer) => (
            <VideoLayerItem
              key={layer.id}
              layer={layer}
              isSelected={selectedLayerId === layer.id}
              isEditing={editingTextId === layer.id}
              onSelect={onSelectLayer}
              onEditStart={onEditStart}
              onTextChange={(text) => onTextChange(layer.id, text)}
              onUpdateLayer={onUpdateLayer}
              onMouseDown={(currentLayer, action, e) => onLayerMouseDown(e, currentLayer, action)}
            />
          ))}

        <button
          onClick={onPlayPause}
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/15 pointer-events-none group-hover:pointer-events-auto"
          style={{ zIndex: 0 }}
        >
          <div className="w-14 h-14 rounded-full bg-black/55 flex items-center justify-center pointer-events-auto">
            {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white ml-1" />}
          </div>
        </button>
      </div>
    </div>
  );
}
