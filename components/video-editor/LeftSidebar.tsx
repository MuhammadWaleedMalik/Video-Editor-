'use client';

import { Settings, Music, User, Zap, Camera, Image, Type, Volume2 } from 'lucide-react';

interface LeftSidebarProps {
  onAddImage: () => void;
  onAddText: () => void;
  onAddAudio: () => void;
}

const tools = [
  { icon: Camera, label: 'Camera' },
  { icon: Settings, label: 'Settings' },
  { icon: Music, label: 'Audio' },
  { icon: User, label: 'Profile' },
  { icon: Zap, label: 'Effects' },
];

export default function LeftSidebar({ onAddImage, onAddText, onAddAudio }: LeftSidebarProps) {
  return (
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

      {/* Divider */}
      <div className="w-6 h-px bg-[#3d2510] my-1" />

      {/* New layer tools */}
      <button
        onClick={onAddImage}
        title="Add Image"
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5a4530] hover:text-[#c9b600] hover:bg-[#2d1a08] transition-colors"
      >
        <Image size={18} />
      </button>

      <button
        onClick={onAddText}
        title="Add Text"
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5a4530] hover:text-[#c9b600] hover:bg-[#2d1a08] transition-colors"
      >
        <Type size={18} />
      </button>

      <button
        onClick={onAddAudio}
        title="Add Audio"
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5a4530] hover:text-[#c9b600] hover:bg-[#2d1a08] transition-colors"
      >
        <Volume2 size={18} />
      </button>
    </aside>
  );
}
