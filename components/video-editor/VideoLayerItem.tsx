import { Image as ImageIcon, Film as FilmIcon } from 'lucide-react';
import { Layer } from '@/types/editor';

type LayerAction = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';

interface VideoLayerItemProps {
  layer: Layer;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (id: string) => void;
  onEditStart: (id: string) => void;
  onTextChange: (text: string) => void;
  onUpdateLayer: (layer: Layer) => void;
  onMouseDown: (layer: Layer, action: LayerAction, event: React.MouseEvent) => void;
}

const baseFont = 'Inter, Arial, sans-serif';

export default function VideoLayerItem({
  layer,
  isSelected,
  isEditing,
  onSelect,
  onEditStart,
  onTextChange,
  onUpdateLayer,
  onMouseDown,
}: VideoLayerItemProps) {
  return (
    <div
      onMouseDown={(e) => onMouseDown(layer, 'move', e)}
      className={`absolute select-none group/layer ${
        isSelected
          ? 'border-2 border-[#c9b600] ring-1 ring-black/40'
          : 'border border-dashed border-[#c9b600]/30 hover:border-[#c9b600]/75'
      }`}
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.width}%`,
        height: `${layer.height}%`,
        zIndex: layer.zIndex,
        cursor: isSelected ? 'move' : 'pointer',
      }}
      onClick={() => onSelect(layer.id)}
    >
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        {layer.type === 'text' && (
          <div className="w-full h-full flex items-center justify-center text-center px-1" style={{ backgroundColor: layer.bgColor || '#00000000' }}>
            {isEditing ? (
              <textarea
                autoFocus
                value={layer.text || ''}
                onChange={(e) => onTextChange(e.target.value)}
                onBlur={() => onUpdateLayer(layer)}
                className="w-full h-full bg-transparent border-none outline-none resize-none font-bold text-center leading-normal"
                style={{ fontSize: `${layer.fontSize || 20}px`, color: layer.color || '#ffffff', fontFamily: layer.fontFamily || baseFont }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                onDoubleClick={(e) => { e.stopPropagation(); onEditStart(layer.id); }}
                className="font-bold select-none cursor-text w-full break-words leading-normal"
                style={{ fontSize: `${layer.fontSize || 20}px`, color: layer.color || '#ffffff', fontFamily: layer.fontFamily || baseFont }}
              >
                {layer.text || 'Double click to edit'}
              </p>
            )}
          </div>
        )}

        {layer.type === 'image' && (
          layer.src ? (
            <img src={layer.src} alt={layer.name} className="w-full h-full object-contain pointer-events-none" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#241508] to-[#120a02] flex flex-col items-center justify-center text-[#c9b600] border border-[#3d2510] gap-1 p-2">
              <ImageIcon size={22} className="opacity-80" />
              <span className="text-[10px] font-semibold opacity-85 text-center truncate w-full">{layer.name}</span>
              <span className="text-[8px] text-[#7a6040] text-center hidden group-hover/layer:block">Upload in sidebar</span>
            </div>
          )
        )}

        {layer.type === 'video' && (
          layer.src ? (
            <video
              src={layer.src}
              className="w-full h-full object-contain pointer-events-none"
              muted={layer.mediaMuted !== false}
              loop
              autoPlay
              playsInline
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#241508] to-[#120a02] flex flex-col items-center justify-center text-[#c9b600] border border-[#3d2510] gap-1 p-2">
              <FilmIcon size={22} className="opacity-80 animate-pulse" />
              <span className="text-[10px] font-semibold opacity-85 text-center truncate w-full">{layer.name}</span>
              <span className="text-[8px] text-[#7a6040] text-center hidden group-hover/layer:block">Upload in sidebar</span>
            </div>
          )
        )}
      </div>

      {isSelected && (
        <>
          <div onMouseDown={(e) => onMouseDown(layer, 'resize-tl', e)} className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nwse-resize z-10 hover:bg-[#c9b600]" />
          <div onMouseDown={(e) => onMouseDown(layer, 'resize-tr', e)} className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nesw-resize z-10 hover:bg-[#c9b600]" />
          <div onMouseDown={(e) => onMouseDown(layer, 'resize-bl', e)} className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nesw-resize z-10 hover:bg-[#c9b600]" />
          <div onMouseDown={(e) => onMouseDown(layer, 'resize-br', e)} className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nwse-resize z-10 hover:bg-[#c9b600]" />
        </>
      )}
    </div>
  );
}
