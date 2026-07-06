import { Layer } from '@/types/editor';
import { TEXT_THEMES, TextTheme } from '@/lib/textThemes';

interface LayerTextStyleFieldsProps {
  layer: Layer;
  onUpdate: (next: Layer) => void;
}

export default function LayerTextStyleFields({ layer, onUpdate }: LayerTextStyleFieldsProps) {
  const currentTheme = TEXT_THEMES.find((theme) => theme.id === layer.themeId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[9px] text-[#5a4530]">Text Content</label>
        <textarea
          value={layer.text || ''}
          onChange={(e) => onUpdate({ ...layer, text: e.target.value })}
          className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600] h-16 resize-none"
          placeholder="Type layer text..."
          style={{ fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif' }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[9px] text-[#5a4530]">Theme</label>
        <div className="grid grid-cols-2 gap-2">
          {TEXT_THEMES.map((theme: TextTheme) => {
            const isActive = layer.fontFamily === theme.fontFamily || layer.themeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() =>
                  onUpdate({
                    ...layer,
                    themeId: theme.id,
                    fontFamily: theme.fontFamily,
                    fontSize: theme.fontSize ?? layer.fontSize ?? 20,
                    color: theme.color ?? layer.color ?? '#ffffff',
                    bgColor: theme.bgColor ?? layer.bgColor ?? '#00000000',
                  })
                }
                className={`text-left px-2 py-1.5 rounded-lg border text-[8px] transition-colors ${
                  isActive
                    ? 'border-[#c9b600] bg-[#2d1a08] text-[#c9b600]'
                    : 'border-[#3d2510] bg-[#1f1005] text-[#a89575] hover:border-[#7a6040]'
                }`}
              >
                <span className="block font-semibold text-[9px] text-[#d7c08a]">{theme.name}</span>
                <span className="block truncate opacity-80" style={{ fontFamily: theme.fontFamily }}>
                  AaBbCc 012
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[8px] text-[#6a5036]">
          Active: <span style={{ fontFamily: currentTheme?.fontFamily || layer.fontFamily || 'Inter' }}>AaBbCc123</span>
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[9px] text-[#5a4530]">
          <span>Font Size</span>
          <span className="font-mono">{layer.fontSize || 20}px</span>
        </div>
        <input
          type="range"
          min="10"
          max="80"
          value={layer.fontSize || 20}
          onChange={(e) => onUpdate({ ...layer, fontSize: Number(e.target.value) })}
          className="accent-[#c9b600] w-full"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-[#5a4530]">Text Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={layer.color || '#ffffff'}
            onChange={(e) => onUpdate({ ...layer, color: e.target.value })}
            className="w-8 h-8 rounded border border-[#3d2510] bg-transparent cursor-pointer"
          />
          <input
            type="text"
            value={layer.color || '#ffffff'}
            onChange={(e) => onUpdate({ ...layer, color: e.target.value })}
            className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none flex-1 font-mono"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-[#5a4530]">Background Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={layer.bgColor === '#00000000' ? '#000000' : layer.bgColor || '#000000'}
            onChange={(e) => onUpdate({ ...layer, bgColor: e.target.value })}
            className="w-8 h-8 rounded border border-[#3d2510] bg-transparent cursor-pointer"
          />
          <select
            value={layer.bgColor === '#00000000' ? 'transparent' : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'transparent') {
                onUpdate({ ...layer, bgColor: '#00000000' });
              } else {
                onUpdate({ ...layer, bgColor: '#00000088' });
              }
            }}
            className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none"
          >
            <option value="transparent">Transparent</option>
            <option value="custom">Solid / Custom Color</option>
          </select>
        </div>
        {layer.bgColor !== '#00000000' && (
          <input
            type="text"
            value={layer.bgColor}
            onChange={(e) => onUpdate({ ...layer, bgColor: e.target.value })}
            className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none font-mono"
          />
        )}
      </label>
    </div>
  );
}
