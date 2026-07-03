'use client';

import { Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Layer, ImageLayer, TextLayer, AudioLayer } from '@/types/editor';

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onDeleteLayer: (layerId: string) => void;
}

export default function LayersPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
}: LayersPanelProps) {
  const selectedLayer = selectedLayerId ? layers.find((l) => l.id === selectedLayerId) : null;

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const handleMoveUp = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (layer) {
      const maxZ = Math.max(...layers.map((l) => l.zIndex));
      onUpdateLayer(id, { zIndex: Math.min(layer.zIndex + 1, maxZ) });
    }
  };

  const handleMoveDown = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (layer) {
      onUpdateLayer(id, { zIndex: Math.max(layer.zIndex - 1, 0) });
    }
  };

  return (
    <div className="w-full h-full p-3 flex flex-col overflow-hidden">
      {/* Layers list */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {layers.length === 0 ? (
          <p className="text-xs text-[#5a4530]">No layers. Add image, text, or audio from the left sidebar.</p>
        ) : (
          sortedLayers.map((layer) => (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`p-2 rounded border cursor-pointer transition-all ${
                selectedLayerId === layer.id
                  ? 'border-[#c9b600] bg-[#2d1a08]'
                  : 'border-[#3d2510] hover:border-[#7a6040]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#c8b88a] truncate">
                    {layer.type === 'image' && `🖼 Image`}
                    {layer.type === 'text' && `📝 Text`}
                    {layer.type === 'audio' && `🔊 Audio`}
                  </p>
                  <p className="text-[10px] text-[#5a4530]">
                    {layer.startTime.toFixed(1)}s - {layer.endTime.toFixed(1)}s
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                  className="text-[#5a4530] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Properties panel */}
      {selectedLayer && (
        <div className="border-t border-[#3d2510] pt-3 space-y-3">
          {/* Z-Index Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => handleMoveUp(selectedLayer.id)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#2d1a08] border border-[#3d2510] px-2 py-1.5 rounded text-[#c8b88a] hover:border-[#c9b600] hover:text-[#c9b600] transition-colors text-xs font-bold uppercase"
            >
              <ChevronUp size={12} />
              Forward
            </button>
            <button
              onClick={() => handleMoveDown(selectedLayer.id)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#2d1a08] border border-[#3d2510] px-2 py-1.5 rounded text-[#c8b88a] hover:border-[#c9b600] hover:text-[#c9b600] transition-colors text-xs font-bold uppercase"
            >
              <ChevronDown size={12} />
              Backward
            </button>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#5a4530] uppercase">Start Time</label>
            <input
              type="number"
              step="0.1"
              value={selectedLayer.startTime}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { startTime: parseFloat(e.target.value) })}
              className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#5a4530] uppercase">End Time</label>
            <input
              type="number"
              step="0.1"
              value={selectedLayer.endTime}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { endTime: parseFloat(e.target.value) })}
              className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
            />
          </div>

          {selectedLayer.type !== 'audio' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Position X</label>
                <input
                  type="number"
                  value={(selectedLayer as ImageLayer | TextLayer).x}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { x: parseFloat(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Position Y</label>
                <input
                  type="number"
                  value={(selectedLayer as ImageLayer | TextLayer).y}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { y: parseFloat(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Width</label>
                <input
                  type="number"
                  value={(selectedLayer as ImageLayer | TextLayer).width}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { width: parseFloat(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Height</label>
                <input
                  type="number"
                  value={(selectedLayer as ImageLayer | TextLayer).height}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { height: parseFloat(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={(selectedLayer as ImageLayer | TextLayer).opacity}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Border Radius</label>
                <input
                  type="number"
                  min="0"
                  value={selectedLayer.type === 'image' ? (selectedLayer as ImageLayer).borderRadius : (selectedLayer as TextLayer).borderRadius}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { borderRadius: parseInt(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>
            </>
          )}

          {selectedLayer.type === 'image' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Border Width</label>
                <input
                  type="number"
                  min="0"
                  value={(selectedLayer as ImageLayer).borderWidth}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { borderWidth: parseInt(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Border Color</label>
                <input
                  type="color"
                  value={(selectedLayer as ImageLayer).borderColor}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { borderColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Scale</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={(selectedLayer as ImageLayer).scale}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { scale: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Rotation (deg)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={(selectedLayer as ImageLayer).rotation}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { rotation: parseInt(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>
            </>
          )}

          {selectedLayer.type === 'text' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Text</label>
                <textarea
                  value={(selectedLayer as TextLayer).text}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { text: e.target.value })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none h-16 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Font Size</label>
                <input
                  type="number"
                  min="8"
                  value={(selectedLayer as TextLayer).fontSize}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) })
                  }
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Text Color</label>
                <input
                  type="color"
                  value={(selectedLayer as TextLayer).color}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Font Weight</label>
                <select
                  value={(selectedLayer as TextLayer).fontWeight}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { fontWeight: e.target.value as 'normal' | 'bold' | '900' })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="900">Extra Bold</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Text Align</label>
                <select
                  value={(selectedLayer as TextLayer).textAlign}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { textAlign: e.target.value as 'left' | 'center' | 'right' })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Font Family</label>
                <select
                  value={(selectedLayer as TextLayer).fontFamily}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                >
                  <option>Arial</option>
                  <option>Helvetica</option>
                  <option>Times New Roman</option>
                  <option>Courier New</option>
                  <option>Georgia</option>
                  <option>Verdana</option>
                  <option>Comic Sans MS</option>
                  <option>Trebuchet MS</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Background Color</label>
                <input
                  type="color"
                  value={(selectedLayer as TextLayer).backgroundColor}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { backgroundColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Background Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={(selectedLayer as TextLayer).backgroundOpacity}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, { backgroundOpacity: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#5a4530] uppercase">Padding</label>
                <input
                  type="number"
                  min="0"
                  value={(selectedLayer as TextLayer).padding}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { padding: parseInt(e.target.value) })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                />
              </div>
            </>
          )}

          {selectedLayer.type === 'audio' && (
            <div>
              <label className="text-[10px] font-bold text-[#5a4530] uppercase">Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={(selectedLayer as AudioLayer).volume}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { volume: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          {/* Z-order controls */}
          <div className="flex gap-2">
            <button
              onClick={() => handleMoveUp(selectedLayer.id)}
              className="flex-1 flex items-center justify-center gap-1 text-xs bg-[#2d1a08] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] hover:border-[#7a6040] transition-colors"
            >
              <ChevronUp size={12} /> Up
            </button>
            <button
              onClick={() => handleMoveDown(selectedLayer.id)}
              className="flex-1 flex items-center justify-center gap-1 text-xs bg-[#2d1a08] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] hover:border-[#7a6040] transition-colors"
            >
              <ChevronDown size={12} /> Down
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
