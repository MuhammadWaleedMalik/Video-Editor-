'use client';

import { Download, Eye, Zap } from 'lucide-react';
import { VideoFormat } from '@/types/editor';

const FORMATS: VideoFormat[] = ['16:9', '9:16', '1:1'];

interface EditorHeaderProps {
  title: string;
  format: VideoFormat;
  onTitleChange: (title: string) => void;
  onFormatChange: (format: VideoFormat) => void;
  onPreviewOpen: () => void;
}

export default function EditorHeader({
  title,
  format,
  onTitleChange,
  onFormatChange,
  onPreviewOpen,
}: EditorHeaderProps) {
  return (
    <header className="min-h-14 bg-[#120a02] border-b border-[#3d2510] px-4 py-2 shrink-0">
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 bg-[#c9b600] text-[#1a0c05] font-black text-sm px-2.5 py-1 rounded-md">
            <Zap size={14} fill="currentColor" />
            CVVID
          </div>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="bg-transparent text-[#c8b88a] text-sm font-medium border-none outline-none focus:text-[#e8d5a0] min-w-0 w-full sm:w-auto"
            placeholder="Project title — Draft"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[#5a4530] text-[10px] font-bold uppercase tracking-wider mr-1">Format</span>
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => onFormatChange(fmt)}
                className={`text-[11px] px-2 py-1 rounded border font-semibold transition-all ${
                  fmt === format
                    ? 'border-[#c9b600] text-[#c9b600] bg-[#2d1a08] shadow-[0_0_8px_rgba(201,182,0,0.3)]'
                    : 'border-[#3d2510] text-[#5a4530] hover:border-[#7a6040] hover:text-[#9a8060]'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-[#3d2510] hidden sm:block" />

          <button
            onClick={onPreviewOpen}
            className="flex items-center gap-2 text-[#c8b88a] text-sm border border-[#3d2510] px-3 py-1.5 rounded-lg hover:border-[#c9b600] hover:text-[#e8d5a0] transition-colors"
          >
            <Eye size={14} />
            Preview
          </button>
          <button className="flex items-center gap-1.5 bg-[#c9b600] text-[#1a0c05] font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-[#e0cc00] transition-colors">
            Export
            <Download size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}

