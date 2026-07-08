'use client';

import { Download, Eye, UploadCloud, Zap } from 'lucide-react';
import { VideoFormat } from '@/types/editor';

const FORMATS: VideoFormat[] = ['16:9', '9:16', '1:1'];

interface EditorHeaderProps {
  title: string;
  format: VideoFormat;
  onTitleChange: (title: string) => void;
  onFormatChange: (format: VideoFormat) => void;
  onPreviewOpen: () => void;
  onImport: () => void;
}

export default function EditorHeader({
  title,
  format,
  onTitleChange,
  onFormatChange,
  onPreviewOpen,
  onImport,
}: EditorHeaderProps) {
  return (
    <header className="min-h-14 shrink-0 border-b border-[#3d2510] bg-[#120a02] px-2 py-2 sm:px-4">
      <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3 lg:w-auto">
          <div className="flex items-center gap-1.5 bg-[#c9b600] text-[#1a0c05] font-black text-sm px-2.5 py-1 rounded-md">
            <Zap size={14} fill="currentColor" />
            CVVID
          </div>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent text-sm font-medium text-[#c8b88a] outline-none focus:text-[#e8d5a0] sm:w-auto"
            placeholder="Project title — Draft"
          />
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-thin lg:w-auto lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
          <div className="flex shrink-0 items-center gap-1.5">
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
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#3d2510] px-3 py-1.5 text-sm text-[#c8b88a] transition-colors hover:border-[#c9b600] hover:text-[#e8d5a0]"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={onImport}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#3d2510] px-3 py-1.5 text-sm font-semibold text-[#c8b88a] transition-colors hover:border-[#c9b600] hover:text-[#e8d5a0]"
          >
            <UploadCloud size={14} />
            Import
          </button>
          <button className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#c9b600] px-3 py-1.5 text-sm font-semibold text-[#1a0c05] transition-colors hover:bg-[#e0cc00]">
            Export
            <Download size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
