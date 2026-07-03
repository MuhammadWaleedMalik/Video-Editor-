'use client';

import { Settings, Music, User, Zap, Camera, Image, Film, Type, Trash2, Plus, Layers } from 'lucide-react';
import { Layer } from '@/types/editor';

const tools = [
  { icon: Camera, label: 'Camera' },
  { icon: Settings, label: 'Settings' },
  { icon: Music, label: 'Audio' },
  { icon: User, label: 'Profile' },
  { icon: Zap, label: 'Effects' },
];

interface LeftSidebarProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (type: 'image' | 'video' | 'text') => void;
  onDeleteLayer: (id: string) => void;
}

export default function LeftSidebar({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
}: LeftSidebarProps) {

  const handleDragStart = (e: React.DragEvent, type: 'image' | 'video' | 'text') => {
    e.dataTransfer.setData('layerType', type);
  };

  return (
    <div className="flex h-full shrink-0">
      {/* Original Icon Sidebar Column */}
      <aside className="w-12 bg-[#120a02] border-r border-[#3d2510] flex flex-col items-center py-3 gap-1 shrink-0">
        {tools.map(({ icon: Icon, label }) => (
          <button
            key={label}
            title={label}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5a4530] hover:text-[#c9b600] hover:bg-[#2d1a08] transition-colors"
          >
            <Icon size={18} />
          </button>
        ))}
      </aside>

      {/* Layers & Creator Sidebar Column */}
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
            {/* Add Image */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'image')}
              onClick={() => onAddLayer('image')}
              className="flex items-center justify-between p-2 rounded-lg bg-[#241508] border border-[#3d2510] hover:border-[#c9b600] hover:bg-[#2d1a08] cursor-grab active:cursor-grabbing text-xs text-[#c8b88a] font-medium transition-all group"
              title="Drag onto Canvas or click to add"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#3d2510] flex items-center justify-center text-[#c9b600] group-hover:bg-[#c9b600] group-hover:text-[#1a0c05] transition-colors">
                  <Image size={12} />
                </div>
                <span>Image Layer</span>
              </div>
              <Plus size={12} className="text-[#5a4530] group-hover:text-[#c9b600] transition-colors" />
            </div>

            {/* Add Video */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'video')}
              onClick={() => onAddLayer('video')}
              className="flex items-center justify-between p-2 rounded-lg bg-[#241508] border border-[#3d2510] hover:border-[#c9b600] hover:bg-[#2d1a08] cursor-grab active:cursor-grabbing text-xs text-[#c8b88a] font-medium transition-all group"
              title="Drag onto Canvas or click to add"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#3d2510] flex items-center justify-center text-[#c9b600] group-hover:bg-[#c9b600] group-hover:text-[#1a0c05] transition-colors">
                  <Film size={12} />
                </div>
                <span>Video Layer</span>
              </div>
              <Plus size={12} className="text-[#5a4530] group-hover:text-[#c9b600] transition-colors" />
            </div>

            {/* Add Text */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'text')}
              onClick={() => onAddLayer('text')}
              className="flex items-center justify-between p-2 rounded-lg bg-[#241508] border border-[#3d2510] hover:border-[#c9b600] hover:bg-[#2d1a08] cursor-grab active:cursor-grabbing text-xs text-[#c8b88a] font-medium transition-all group"
              title="Drag onto Canvas or click to add"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#3d2510] flex items-center justify-center text-[#c9b600] group-hover:bg-[#c9b600] group-hover:text-[#1a0c05] transition-colors">
                  <Type size={12} />
                </div>
                <span>Text Layer</span>
              </div>
              <Plus size={12} className="text-[#5a4530] group-hover:text-[#c9b600] transition-colors" />
            </div>
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
                  if (layer.type === 'image') Icon = Image;
                  if (layer.type === 'video') Icon = Film;

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
