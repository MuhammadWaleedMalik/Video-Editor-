'use client';

import { Layer } from '@/types/editor';

interface LayerCommonFieldsProps {
  layer: Layer;
  duration: number;
  onUpdate: (next: Layer) => void;
}

export default function LayerCommonFields({
  layer,
  duration,
  onUpdate,
}: LayerCommonFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-[#7a6040] uppercase font-bold tracking-wider">Layer Name</label>
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdate({ ...layer, name: e.target.value })}
          className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-3 py-1.5 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-[#5a4530]">X Position (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round(layer.x)}
              onChange={(e) => onUpdate({ ...layer, x: Math.max(0, Math.min(100, Number(e.target.value))) })}
              className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-[#5a4530]">Y Position (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={Math.round(layer.y)}
              onChange={(e) => onUpdate({ ...layer, y: Math.max(0, Math.min(100, Number(e.target.value))) })}
              className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-[#5a4530]">Width (%)</span>
            <input
              type="number"
              min="5"
              max="100"
              value={Math.round(layer.width)}
              onChange={(e) => onUpdate({ ...layer, width: Math.max(5, Math.min(100, Number(e.target.value))) })}
              className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-[#5a4530]">Height (%)</span>
            <input
              type="number"
              min="5"
              max="100"
              value={Math.round(layer.height)}
              onChange={(e) => onUpdate({ ...layer, height: Math.max(5, Math.min(100, Number(e.target.value))) })}
              className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-[#5a4530]">Show From (s)</span>
            <input
              type="number"
              min="0"
              max={duration || undefined}
              step="0.1"
              value={Number(layer.startTime.toFixed(1))}
              onChange={(e) => {
                const next = Math.max(0, Number(e.target.value));
                onUpdate({ ...layer, startTime: Math.min(next, layer.endTime - 0.1) });
              }}
              className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[9px] text-[#5a4530]">Show Until (s)</span>
            <input
              type="number"
              min="0"
              max={duration || undefined}
              step="0.1"
              value={Number(layer.endTime.toFixed(1))}
              onChange={(e) => {
                const next = duration ? Math.min(duration, Number(e.target.value)) : Number(e.target.value);
                onUpdate({ ...layer, endTime: Math.max(next, layer.startTime + 0.1) });
              }}
              className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
