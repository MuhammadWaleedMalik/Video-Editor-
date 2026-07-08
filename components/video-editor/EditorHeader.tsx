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
    <header className="min-h-16 shrink-0 border-b border-[#3d2510] bg-[#120a02] px-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3 lg:w-auto">
          <div className="flex items-center gap-2 rounded-lg bg-[#c9b600] px-3 py-1.5 text-base font-black text-[#1a0c05]">
            <Zap size={16} fill="currentColor" />
            CVVID
          </div>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent text-base font-medium text-[#c8b88a] outline-none focus:text-[#e8d5a0] sm:w-auto"
            placeholder="Project title — Draft"
          />
        </div>

        <div className="flex w-full items-center gap-3 overflow-x-auto pb-1 scrollbar-thin lg:w-auto lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
          <div className="flex shrink-0 items-center gap-2">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-[#5a4530]">Format</span>
            {FORMATS.map((fmt) => (
              <button
                type="button"
                key={fmt}
                onClick={() => onFormatChange(fmt)}
                className={`min-h-11 rounded border px-3 py-2 text-xs font-semibold transition-all ${
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
            type="button"
            onClick={onPreviewOpen}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-[#3d2510] px-4 py-2 text-sm text-[#c8b88a] transition-colors hover:border-[#c9b600] hover:text-[#e8d5a0]"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            type="button"
            onClick={onImport}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[#3d2510] px-4 py-2 text-sm font-semibold text-[#c8b88a] transition-colors hover:border-[#c9b600] hover:text-[#e8d5a0]"
          >
            <UploadCloud size={14} />
            Import
          </button>
          <button type="button" className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[#c9b600] px-4 py-2 text-sm font-semibold text-[#1a0c05] transition-colors hover:bg-[#e0cc00]">
            Export
            <Download size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
