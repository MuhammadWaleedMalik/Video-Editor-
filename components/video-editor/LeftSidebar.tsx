'use client';

import { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { Layer, LayerType } from '@/types/editor';
import LayerTypeMenu, { ObjectType, OBJECT_TYPES } from './LayerTypeMenu';
import LayerTile from './LayerTile';

interface LeftSidebarProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (type: LayerType) => void;
  onDeleteLayer: (id: string) => void;
}

export default function LeftSidebar({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
}: LeftSidebarProps) {
  const [activeType, setActiveType] = useState<ObjectType>('image');

  const grouped = useMemo(() => ({
    image: layers.filter((layer) => layer.type === 'image'),
    video: layers.filter((layer) => layer.type === 'video'),
    text: layers.filter((layer) => layer.type === 'text'),
    audio: layers.filter((layer) => layer.type === 'audio'),
  }), [layers]);

  const activeMeta = OBJECT_TYPES.find((entry) => entry.type === activeType);
  const activeList = activeType === 'subtitle' ? [] : grouped[activeType];
  const hasItems = activeList.length > 0;
  const ActiveIcon = activeMeta?.icon;

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[#3d2510] bg-[#160d05] md:w-60">
        <div className="flex items-center gap-2 border-b border-[#3d2510] p-3">
          <Layers size={13} className="text-[#c9b600]" />
          <h2 className="text-[#e8d5a0] text-xs font-bold uppercase tracking-wider">
            Layer Objects
          </h2>
        </div>

        <div className="p-3 border-b border-[#3d2510]">
          <LayerTypeMenu activeType={activeType} onChange={setActiveType} />
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-3 md:overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-[#7a6040] font-semibold uppercase tracking-wider">
              {activeMeta?.title}
            </h3>
            {activeType !== 'subtitle' ? (
              <button
                type="button"
                onClick={() => onAddLayer(activeType as LayerType)}
                className="text-[10px] flex items-center gap-1 text-[#c9b600] hover:text-[#f6e78a]"
              >
                <span>+</span> Add
              </button>
            ) : null}
          </div>

          {activeType === 'subtitle' ? (
            <p className="text-[11px] rounded-lg border border-dashed border-[#3d2510] text-[#7a6040] p-3">
              Subtitle items are edited from the right panel.
            </p>
          ) : hasItems ? (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
              {activeList.map((layer) => (
                <div key={layer.id} className="w-28 flex-none md:w-auto">
                  <LayerTile
                    layer={layer}
                    isSelected={selectedLayerId === layer.id}
                    onSelect={onSelectLayer}
                    onDelete={onDeleteLayer}
                    previewIcon={ActiveIcon ?? Layers}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddLayer(activeType as LayerType)}
                className="flex aspect-square w-28 flex-none flex-col items-center justify-center rounded-lg border border-dashed border-[#3d2510] bg-[#241508] text-[10px] text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600] md:w-auto"
              >
                + Add more
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddLayer(activeType as LayerType)}
              className="w-full rounded-lg border border-dashed border-[#3d2510] bg-[#241508] text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600] p-3 text-sm flex items-center justify-center gap-2"
            >
              Add your first {activeMeta?.title.toLowerCase().slice(0, -1) || 'item'}
            </button>
          )}
        </div>
      </aside>
  );
}
