'use client';

import { useState } from 'react';
import { Mic, Scissors, Layers, Star, Monitor, Loader2, CheckCircle2 } from 'lucide-react';

interface AIToolsPanelProps {
  bgBlurEnabled: boolean;
  noiseRemoveApplied: boolean;
  hasVideo: boolean;
  onBgBlurToggle: () => void;
  onNoiseRemove: () => Promise<void>;
  onSmartTrim: () => Promise<void>;
}

export default function AIToolsPanel({
  bgBlurEnabled,
  noiseRemoveApplied,
  hasVideo,
  onBgBlurToggle,
  onNoiseRemove,
  onSmartTrim,
}: AIToolsPanelProps) {
  const [loadingNoise, setLoadingNoise] = useState(false);
  const [loadingTrim, setLoadingTrim] = useState(false);
  const [trimDone, setTrimDone] = useState(false);

  async function handleNoiseRemove() {
    if (!hasVideo || loadingNoise) return;
    if (noiseRemoveApplied) {
      await onNoiseRemove();
    } else {
      setLoadingNoise(true);
      await onNoiseRemove();
      setLoadingNoise(false);
    }
  }

  async function handleSmartTrim() {
    if (!hasVideo || loadingTrim) return;
    setLoadingTrim(true);
    setTrimDone(false);
    await onSmartTrim();
    setLoadingTrim(false);
    setTrimDone(true);
  }

  const tools = [
    {
      key: 'noise',
      icon: Mic,
      title: 'Noise Remove',
      desc: 'Remove bg noise',
      loading: loadingNoise,
      done: noiseRemoveApplied,
      onClick: handleNoiseRemove,
    },
    {
      key: 'trim',
      icon: Scissors,
      title: 'Smart Trim',
      desc: 'Auto-trim silence/ums',
      loading: loadingTrim,
      done: trimDone,
      onClick: handleSmartTrim,
    },
    {
      key: 'blur',
      icon: Layers,
      title: 'BG Blur',
      desc: 'Privacy blur',
      loading: false,
      done: bgBlurEnabled,
      onClick: onBgBlurToggle,
    },
    {
      key: 'coach',
      icon: Star,
      title: 'Delivery Coach',
      desc: 'PRO',
      loading: false,
      done: false,
      onClick: undefined,
      pro: true,
    },
  ];

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#c9b600] text-[#1a0c05]">
          AI Tools
        </span>
        <span className="text-[#7a6040] text-[10px]">One-click</span>
      </div>

      {/* Tool cards */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto scrollbar-thin">
        {tools.map((tool) => {
          const disabled = !hasVideo || tool.loading;
          return (
            <button
              key={tool.key}
              onClick={tool.onClick}
              disabled={disabled || (!tool.onClick)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left w-full group ${
                tool.done
                  ? 'border-[#c9b600] bg-[#2d1a08]'
                  : disabled
                  ? 'border-[#2a1808] bg-[#160a02] opacity-60 cursor-not-allowed'
                  : 'border-[#3d2510] bg-[#1f1005] hover:border-[#6a4520] hover:bg-[#2d1a08] cursor-pointer'
              }`}
            >
              {/* Icon */}
              <div className={`w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors ${
                tool.done ? 'bg-[#c9b600]' : 'bg-[#2d1a08]'
              }`}>
                {tool.loading ? (
                  <Loader2 size={13} className="text-[#c9b600] animate-spin" />
                ) : tool.done ? (
                  <CheckCircle2 size={13} className="text-[#1a0c05]" />
                ) : (
                  <tool.icon size={13} className="text-[#c9b600]" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-semibold truncate ${tool.done ? 'text-[#c9b600]' : 'text-[#e8d5a0]'}`}>
                    {tool.loading
                      ? 'Processing...'
                      : tool.done && tool.key !== 'blur'
                      ? `${tool.title} ✓`
                      : tool.title}
                  </p>
                  {tool.pro && (
                    <span className="text-[8px] font-bold px-1 py-px rounded bg-[#c9b600] text-[#1a0c05] shrink-0">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-[#6a5030] text-[10px]">{tool.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Teleprompter footer */}
      <div className="shrink-0 pt-2 border-t border-[#3d2510]">
        <div className="flex items-center gap-2 text-[#5a4530] text-[10px]">
          <Monitor size={10} />
          <span>Teleprompter</span>
          <span className="ml-auto text-[9px] bg-[#2d1a08] px-1.5 py-px rounded text-[#4a3010]">
            Soon
          </span>
        </div>
      </div>
    </div>
  );
}
