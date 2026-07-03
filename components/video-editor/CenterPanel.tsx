'use client';

import { useState } from 'react';
import { Mic, Scissors, Layers, Star, Monitor } from 'lucide-react';

interface CenterPanelProps {
  bgBlurEnabled: boolean;
  onBgBlurToggle: () => void;
}

const aiTools = [
  {
    icon: Mic,
    title: 'Noise Remove',
    desc: 'Remove bg noise',
    iconBg: '#2a1a08',
  },
  {
    icon: Scissors,
    title: 'Smart Trim',
    desc: 'Remove silence/ums',
    iconBg: '#2a1a08',
  },
  {
    icon: Layers,
    title: 'BG Blur',
    desc: 'Privacy blur',
    iconBg: '#2a1a08',
  },
  {
    icon: Star,
    title: 'Delivery Coach',
    desc: 'PRO',
    iconBg: '#2a1a08',
    pro: true,
  },
];

const teleprompterLines = [
  'Hi, my name is Jamie and I\'m a',
  'frontend developer with 5 years of',
  'experience building React applications...',
  'I specialise in performance optimisation',
];

export default function CenterPanel({ bgBlurEnabled, onBgBlurToggle }: CenterPanelProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'teleprompter'>('ai');
  const [teleprompterOn, setTeleprompterOn] = useState(true);
  const [speed, setSpeed] = useState(2.0);

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Tab buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'ai'
              ? 'bg-[#c9b600] text-[#1a0c05]'
              : 'bg-[#2d1a08] text-[#9a8060] hover:text-[#c8b88a]'
          }`}
        >
          <Star size={12} />
          AI Tools
        </button>
        <button
          onClick={() => setActiveTab('teleprompter')}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'teleprompter'
              ? 'bg-[#c9b600] text-[#1a0c05]'
              : 'bg-[#2d1a08] text-[#9a8060] hover:text-[#c8b88a]'
          }`}
        >
          <Monitor size={12} />
          Teleprompter
        </button>
      </div>

      {activeTab === 'ai' && (
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#c9b600] text-[#1a0c05]">AI Tools</span>
            <span className="text-[#9a8060] text-xs">One-click enhancements</span>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {aiTools.map((tool) => (
              <button
                key={tool.title}
                onClick={tool.title === 'BG Blur' ? onBgBlurToggle : undefined}
                className={`flex flex-col gap-2 p-3 rounded-xl border transition-all text-left ${
                  tool.title === 'BG Blur' && bgBlurEnabled
                    ? 'border-[#c9b600] bg-[#2d1a08]'
                    : 'border-[#3d2510] bg-[#1f1005] hover:border-[#6a4520] hover:bg-[#2d1a08]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <tool.icon size={16} className="text-[#c9b600]" />
                  {tool.pro && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#c9b600] text-[#1a0c05]">PRO</span>
                  )}
                  {tool.title === 'BG Blur' && bgBlurEnabled && (
                    <span className="text-[9px] font-bold text-[#c9b600]">ON</span>
                  )}
                </div>
                <div>
                  <p className="text-[#e8d5a0] text-xs font-semibold">{tool.title}</p>
                  <p className="text-[#7a6040] text-[10px]">{tool.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'teleprompter' && (
        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor size={12} className="text-[#c9b600]" />
              <span className="text-[#c8b88a] text-xs font-semibold">Teleprompter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#7a6040] text-xs">
                Speed: {speed.toFixed(1)}x
              </span>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-16 accent-[#c9b600]"
              />
              <button
                onClick={() => setTeleprompterOn(!teleprompterOn)}
                className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
                  teleprompterOn
                    ? 'bg-[#c9b600] text-[#1a0c05]'
                    : 'bg-[#3d2510] text-[#7a6040]'
                }`}
              >
                {teleprompterOn ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#0d0703] rounded-xl p-4 overflow-hidden flex flex-col justify-center">
            {teleprompterLines.map((line, i) => (
              <p
                key={i}
                className={`text-center leading-relaxed transition-all ${
                  i === 1
                    ? 'text-white text-lg font-bold'
                    : i === 0
                    ? 'text-[#c8b88a] text-base'
                    : 'text-[#7a6040] text-sm'
                }`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
