'use client';

import { Layer } from '@/types/editor';

interface LayerCommonFieldsProps {
  layer: Layer;
  onUpdate: (next: Layer) => void;
}

export default function LayerCommonFields({
  layer,
  onUpdate,
}: LayerCommonFieldsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] text-[#7a6040] uppercase font-bold tracking-wider">Layer Name</label>
      <input
        type="text"
        value={layer.name}
        onChange={(e) => onUpdate({ ...layer, name: e.target.value })}
        className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-3 py-1.5 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600]"
      />
    </div>
  );
}
