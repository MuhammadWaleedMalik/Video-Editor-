'use client';

import { useRef, useState } from 'react';
import { Upload, Video, Camera } from 'lucide-react';
import BrowserVideoRecorder from './BrowserVideoRecorder';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
}

export default function VideoUpload({ onVideoUpload }: VideoUploadProps) {
  const browseInputRef = useRef<HTMLInputElement>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onVideoUpload(file);
      e.target.value = '';
    }
  }

  function openPicker(type: 'browse' | 'camera') {
    if (type === 'browse') browseInputRef.current?.click();
    else setShowRecorder(true);
  }

  function handleAreaClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-upload-action]')) return;
    browseInputRef.current?.click();
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-0 p-4 sm:p-6">
      <div
        className="flex flex-col items-center justify-center gap-5 sm:gap-6 border-2 border-dashed border-[#4a3010] rounded-2xl p-6 sm:p-8 md:p-12 lg:p-16 cursor-pointer hover:border-[#c9b600] transition-colors group w-full max-w-3xl mx-2 sm:mx-0"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={handleAreaClick}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target?.closest('[data-upload-action]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="w-20 h-20 rounded-full bg-[#2d1a08] flex items-center justify-center group-hover:bg-[#3a2210] transition-colors">
          <Video size={36} className="text-[#c9b600]" />
        </div>
        <div className="text-center">
          <p className="text-[#e8d5a0] text-lg font-semibold mb-1">Drop your video here</p>
          <p className="text-[#7a6040] text-sm">or choose a source</p>
          <p className="text-[#5a4530] text-xs mt-2">MP4, MOV, WebM, AVI supported</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm px-2 sm:px-0">
          <button
            type="button"
            data-upload-action="browse"
            onClick={(e) => {
              e.stopPropagation();
              openPicker('browse');
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-[#2d1a08] border border-[#3d2510] hover:border-[#c9b600] text-[#c8b88a] font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-[#33200d] transition-colors"
          >
            <Upload size={16} />
            Browse Video
          </button>
          <button
            type="button"
            data-upload-action="record"
            onClick={(e) => {
              e.stopPropagation();
              openPicker('camera');
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-[#2d1a08] border border-[#3d2510] hover:border-[#c9b600] text-[#c8b88a] font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-[#33200d] transition-colors"
          >
            <Camera size={16} />
            Capture Video
          </button>
        </div>
        <input
          ref={browseInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <BrowserVideoRecorder
          isOpen={showRecorder}
          title="Record Project Video"
          onClose={() => setShowRecorder(false)}
          onCapture={onVideoUpload}
        />
      </div>
    </div>
  );
}
