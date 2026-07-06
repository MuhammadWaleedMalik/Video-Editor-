'use client';

import { Music, Image as ImageIcon, Film, Type, Trash2, Plus, Layers, type LucideIcon } from 'lucide-react';
import { Layer, LayerType } from '@/types/editor';

interface LeftSidebarProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (type: LayerType) => void;
  onDeleteLayer: (id: string) => void;
}

const layerCreators: Array<{ type: LayerType; icon: LucideIcon; label: string }> = [
  { type: 'image', icon: ImageIcon, label: 'Image Layer' },
  { type: 'video', icon: Film, label: 'Video Layer' },
  { type: 'text', icon: Type, label: 'Text Layer' },
  { type: 'audio', icon: Music, label: 'Audio Layer' },
];

export default function LeftSidebar({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
}: LeftSidebarProps) {

  const handleDragStart = (e: React.DragEvent, type: Exclude<LayerType, 'audio'>) => {
    e.dataTransfer.setData('layerType', type);
  };

  return (
    <div className="flex h-full shrink-0">
      <aside className="w-60 bg-[#160d05] border-r border-[#3d2510] flex flex-col overflow-hidden shrink-0">
        {/* Header */}
        <div className="p-3 border-b border-[#3d2510] flex items-center gap-2">
          <Layers size={14} className="text-[#c9b600]" />
          <h2 className="text-[#e8d5a0] text-xs font-bold uppercase tracking-wider">Canvas Layers</h2>
        </div>

        {/* Creator Section */}
        <div className="p-3 border-b border-[#3d2510] flex flex-col gap-2">
          <p className="text-[10px] text-[#7a6040] font-semibold uppercase tracking-wider">Add Elements</p>
          <div className="grid grid-cols-1 gap-2">
            {layerCreators.map(({ type, icon: Icon, label }) => (
              <div
                key={type}
                draggable={type !== 'audio'}
                onDragStart={(e) => {
                  if (type === 'audio') return;
                  handleDragStart(e, type);
                }}
                onClick={() => onAddLayer(type)}
                className="flex items-center justify-between p-2 rounded-lg bg-[#241508] border border-[#3d2510] hover:border-[#c9b600] hover:bg-[#2d1a08] cursor-grab active:cursor-grabbing text-xs text-[#c8b88a] font-medium transition-all group"
                title="Drag onto Canvas or click to add"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#3d2510] flex items-center justify-center text-[#c9b600] group-hover:bg-[#c9b600] group-hover:text-[#1a0c05] transition-colors">
                    <Icon size={12} />
                  </div>
                  <span>{label}</span>
                </div>
                <Plus size={12} className="text-[#5a4530] group-hover:text-[#c9b600] transition-colors" />
              </div>
            ))}
          </div>
          <p className="text-[9px] text-[#5a4530] italic text-center mt-1">
            Tip: Drag and drop items onto the video preview canvas directly!
          </p>
        </div>

        {/* Layers List Section */}
        <div className="flex-1 flex flex-col min-h-0 p-3">
          <p className="text-[10px] text-[#7a6040] font-semibold uppercase tracking-wider mb-2">Layers ({layers.length})</p>
          <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col gap-1.5">
            {layers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 border border-dashed border-[#3d2510] rounded-xl p-3 text-center">
                <Layers size={20} className="text-[#3d2510] mb-1.5" />
                <p className="text-[10px] text-[#5a4530]">No layers added yet.</p>
              </div>
            ) : (
              // Sort by z-index descending to show top layers at the top of the list
              [...layers]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((layer) => {
                  const isSelected = selectedLayerId === layer.id;
                  let Icon = Type;
                  if (layer.type === 'image') Icon = ImageIcon;
                  if (layer.type === 'video') Icon = Film;
                  if (layer.type === 'audio') Icon = Music;

                  return (
                    <div
                      key={layer.id}
                      onClick={() => onSelectLayer(layer.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#2d1a08] border-[#c9b600] text-[#c9b600]'
                          : 'bg-[#1f1005] border-[#3d2510] text-[#a89575] hover:border-[#5a4530]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={12} className="shrink-0 text-[#c9b600]" />
                        <span className="text-xs truncate font-medium">{layer.name}</span>
                        <span className="text-[8px] px-1 rounded bg-[#2d1a08] text-[#5a4530] shrink-0 border border-[#3d2510]">
                          z:{layer.zIndex}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLayer(layer.id);
                        }}
                        className="text-[#5a4530] hover:text-red-400 p-1 transition-colors shrink-0"
                        title="Delete Layer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
