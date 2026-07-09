'use client';

import { useEffect, useMemo, useState } from 'react';
import { Layer } from '@/types/editor';
import { TEXT_THEMES } from '@/lib/textThemes';

interface LayerTextStyleFieldsProps {
  layer: Layer;
  onUpdate: (next: Layer) => void;
}

const COLOR_PRESETS = ['#ffffff', '#f2d40b', '#ff6b35', '#25d0ab', '#4aa3ff', '#111111'];
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  blue: '#0000ff',
  brown: '#8b4513',
  cyan: '#00ffff',
  gold: '#ffd700',
  gray: '#808080',
  green: '#008000',
  grey: '#808080',
  indegio: '#4b0082',
  indigo: '#4b0082',
  lime: '#00ff00',
  magenta: '#ff00ff',
  navy: '#000080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  purple: '#800080',
  red: '#ff0000',
  silver: '#c0c0c0',
  teal: '#008080',
  violet: '#ee82ee',
  white: '#ffffff',
  yellow: '#ffff00',
};

function expandHexColor(value: string) {
  const trimmed = value.trim();
  if (!HEX_COLOR_PATTERN.test(trimmed)) return null;
  const hex = trimmed.slice(1);
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
  }
  return `#${hex.slice(0, 6)}`.toLowerCase();
}

function parseColorInput(value: string) {
  const trimmed = value.trim();
  const hexColor = expandHexColor(trimmed);
  if (hexColor) return hexColor;
  return NAMED_COLORS[trimmed.toLowerCase().replace(/\s+/g, '')] ?? null;
}

function hexToRgb(value: string) {
  const safeHex = expandHexColor(value) ?? '#000000';
  const numeric = Number.parseInt(safeHex.slice(1), 16);
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
    .join('')}`;
}

interface ColorPopupFieldProps {
  label: string;
  value: string;
  displayValue?: string;
  onChange: (value: string) => void;
}

function ColorPopupField({ label, value, displayValue, onChange }: ColorPopupFieldProps) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(() => expandHexColor(value) ?? '#000000');
  const [colorInput, setColorInput] = useState(() => expandHexColor(value) ?? '#000000');
  const safeValue = expandHexColor(value) ?? draftValue;
  const rgb = hexToRgb(draftValue);
  const isTransparent = displayValue === '#00000000';
  const inputIsValid = parseColorInput(colorInput) !== null;

  useEffect(() => {
    const next = expandHexColor(value);
    if (!next) return;
    setDraftValue(next);
    setColorInput(next);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  function commitColor(nextColor: string) {
    const normalized = parseColorInput(nextColor);
    if (!normalized) return;
    setDraftValue(normalized);
    setColorInput(normalized);
    onChange(normalized);
  }

  function handleColorInput(nextValue: string) {
    setColorInput(nextValue);
    const normalized = parseColorInput(nextValue);
    if (!normalized) return;
    setDraftValue(normalized);
    onChange(normalized);
  }

  function updateChannel(channel: 'r' | 'g' | 'b', nextValue: number) {
    const nextRgb = { ...rgb, [channel]: Math.max(0, Math.min(255, nextValue)) };
    commitColor(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  }

  function handleDone() {
    const normalized = parseColorInput(colorInput);
    if (normalized) commitColor(normalized);
    setOpen(false);
  }

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-10 min-w-0 flex-1 touch-manipulation items-center gap-2 rounded-xl border border-[#3d2510] bg-[#1f1005] px-2 py-2 text-left shadow-inner transition hover:border-[#6f5220]"
        aria-label={`Open ${label} color picker`}
      >
        <span
          className="h-7 w-7 shrink-0 rounded-md border border-white/15"
          style={{
            background:
              isTransparent
                ? 'linear-gradient(135deg, transparent 0 45%, #6a5036 45% 55%, transparent 55%), repeating-conic-gradient(#2d1a08 0 25%, #120a02 0 50%) 50% / 8px 8px'
                : safeValue,
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold text-[#d8c08a]">{label}</span>
          <span className="block font-mono text-[10px] text-[#8b724c]">{isTransparent ? 'Transparent' : safeValue}</span>
        </span>
        <span className="rounded-full bg-[#2d1a08] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#c9b600]">
          Make
        </span>
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center overscroll-contain bg-black/35 p-3 backdrop-blur-[2px]"
          onPointerDown={() => setOpen(false)}
        >
          <div
            className="max-h-[min(88svh,560px)] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#4a3010] bg-[#120a02] p-3 shadow-[0_22px_56px_rgba(0,0,0,0.72),0_0_22px_rgba(201,182,0,0.16)] scrollbar-thin sm:p-4"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a6040]">{label} Maker</span>
                <span className="mt-1 block text-[10px] text-[#8b724c]">Type a name, pick a preset, or use sliders.</span>
              </div>
              <button
                type="button"
                onClick={handleDone}
                className="h-8 rounded-lg border border-[#3d2510] px-3 text-[10px] font-bold text-[#c8b88a] hover:border-[#6f5220]"
              >
                Done
              </button>
            </div>

            <div className="mb-3 grid grid-cols-1 gap-3 rounded-xl border border-[#3d2510] bg-[#1a0c05] p-3 min-[360px]:grid-cols-[64px_1fr]">
              <span
                className="h-16 w-16 rounded-xl border border-white/15 shadow-inner"
                style={{ backgroundColor: safeValue }}
              />
              <div className="min-w-0">
                <label className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#7a6040]">Color name or hex</label>
                <input
                  type="text"
                  inputMode="text"
                  value={colorInput}
                  onChange={(event) => handleColorInput(event.target.value)}
                  onBlur={() => {
                    if (!parseColorInput(colorInput)) setColorInput(safeValue);
                  }}
                  placeholder="pink, green, white, indigo"
                  className={`mt-1 min-h-10 w-full rounded-lg border bg-[#120a02] px-2 text-sm text-[#e8d5a0] outline-none ${
                    inputIsValid ? 'border-[#3d2510] focus:border-[#c9b600]' : 'border-[#8a341f] focus:border-[#d96132]'
                  }`}
                  aria-label={`${label} color name or hex value`}
                />
                <p className={`mt-1 text-[9px] ${inputIsValid ? 'text-[#6f5220]' : 'text-[#d96132]'}`}>
                  {inputIsValid ? `Saved as ${safeValue}` : 'Unknown color. Try pink, green, white, indigo, or #ff66aa.'}
                </p>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-6 gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => commitColor(preset)}
                  className="h-9 rounded-lg border border-[#3d2510] ring-offset-2 ring-offset-[#120a02] transition hover:scale-105 hover:ring-1 hover:ring-[#c9b600]"
                  style={{ backgroundColor: preset }}
                  aria-label={`Use ${preset}`}
                />
              ))}
            </div>

            <div className="space-y-3">
              {([
                ['r', 'Red', rgb.r, 'accent-red-500'],
                ['g', 'Green', rgb.g, 'accent-emerald-500'],
                ['b', 'Blue', rgb.b, 'accent-sky-500'],
              ] as const).map(([channel, channelLabel, channelValue, accentClass]) => (
                <label key={channel} className="grid grid-cols-[48px_1fr_38px] items-center gap-2 text-[10px] text-[#8b724c]">
                  <span>{channelLabel}</span>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={channelValue}
                    onChange={(event) => updateChannel(channel, Number(event.target.value))}
                    className={`h-2 w-full touch-pan-x ${accentClass}`}
                  />
                  <span className="text-right font-mono text-[#d7c58a]">{channelValue}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LayerTextStyleFields({ layer, onUpdate }: LayerTextStyleFieldsProps) {
  const currentTheme = useMemo(
    () => TEXT_THEMES.find((theme) => theme.id === layer.themeId) ?? TEXT_THEMES[0],
    [layer.themeId]
  );

  function applyTheme(themeId: string) {
    const theme = TEXT_THEMES.find((item) => item.id === themeId);
    if (!theme) return;
    onUpdate({
      ...layer,
      themeId: theme.id,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize ?? layer.fontSize ?? 20,
      color: theme.color ?? layer.color ?? '#ffffff',
      bgColor: theme.bgColor ?? layer.bgColor ?? '#00000000',
    });
  }

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
        <select
          value={currentTheme?.id ?? layer.themeId ?? 'inter-clean'}
          onChange={(event) => applyTheme(event.target.value)}
          className="min-h-10 w-full rounded-lg border border-[#3d2510] bg-[#1f1005] px-3 py-2 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600]"
        >
          {TEXT_THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
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
        <ColorPopupField
          label="Text color"
          value={layer.color || '#ffffff'}
          onChange={(color) => onUpdate({ ...layer, color })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-[#5a4530]">Background Color</span>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <ColorPopupField
            label="Background"
            value={layer.bgColor === '#00000000' ? '#000000' : layer.bgColor || '#000000'}
            displayValue={layer.bgColor || '#00000000'}
            onChange={(bgColor) => onUpdate({ ...layer, bgColor })}
          />
          <select
            value={layer.bgColor === '#00000000' ? 'transparent' : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'transparent') {
                onUpdate({ ...layer, bgColor: '#00000000' });
              } else {
                onUpdate({ ...layer, bgColor: '#000000' });
              }
            }}
            className="min-h-10 w-full rounded-lg border border-[#3d2510] bg-[#1f1005] px-2 py-1 text-xs text-[#e8d5a0] outline-none sm:w-auto"
          >
            <option value="transparent">Transparent</option>
            <option value="custom">Solid / Custom Color</option>
          </select>
        </div>
      </label>
    </div>
  );
}
