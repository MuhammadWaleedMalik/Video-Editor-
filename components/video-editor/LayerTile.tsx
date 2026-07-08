import { LucideIcon, Trash2 } from 'lucide-react';
import { Layer } from '@/types/editor';

interface LayerTileProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  previewIcon: LucideIcon;
}

function fallbackLabel(Icon: LucideIcon, name: string) {
  return (
    <div className="h-full w-full flex items-center justify-center rounded bg-[#2a1708] text-[#7a6040]">
      <Icon size={18} />
      <span className="ml-2 text-[10px]">{name}</span>
    </div>
  );
}

function renderSource(layer: Layer, activeIcon: LayerTileProps['previewIcon']) {
  if (layer.type === 'image' && layer.src) {
    return <img src={layer.src} alt={layer.name} className="h-full w-full object-cover rounded" />;
  }
  if (layer.type === 'video' && layer.src) {
    return (
      <video
        muted
        playsInline
        preload="metadata"
        src={layer.src}
        className="h-full w-full object-cover rounded"
      />
    );
  }
  if (layer.type === 'text') {
    const text = layer.text?.trim() || 'Text';
    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded p-2 text-center"
        style={{ backgroundColor: layer.bgColor === '#00000000' ? '#1a1007' : layer.bgColor || '#1a1007' }}
      >
        <span
          className="block max-h-full overflow-hidden break-words leading-tight"
          style={{
            color: layer.color || '#ffffff',
            fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
            fontSize: `${Math.max(10, Math.min(18, Math.round((layer.fontSize || 20) * 0.6)))}px`,
          }}
        >
          {text}
        </span>
      </div>
    );
  }
  return fallbackLabel(activeIcon, 'No asset');
}

export default function LayerTile({
  layer,
  isSelected,
  onSelect,
  onDelete,
  previewIcon,
}: LayerTileProps) {
  const borderClass = isSelected ? 'border-[#c9b600] text-[#c9b600]' : 'border-[#2d1f10] text-[#a89575]';
  const displayText = layer.type === 'text' ? layer.text?.slice(0, 16) || 'Text' : layer.name;
  return (
    <div
      onClick={() => onSelect(layer.id)}
      className={`rounded-lg border bg-[#241508] p-1 cursor-pointer transition-colors ${borderClass}`}
    >
      <div className="relative aspect-square rounded border border-[#3d2510] bg-[#180f06] overflow-hidden">
        {renderSource(layer, previewIcon)}
        <button
          type="button"
          aria-label={`Delete ${layer.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(layer.id);
          }}
          className="absolute top-1 right-1 p-1 rounded bg-black/55 text-[#d7bfb0] hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="mt-1 px-1 pb-1">
        <p className="text-[10px] leading-tight truncate">{displayText}</p>
        {layer.type === 'audio' && layer.src ? (
          <p className="text-[9px] text-[#5a4530] truncate">{layer.name}</p>
        ) : null}
      </div>
    </div>
  );
}
