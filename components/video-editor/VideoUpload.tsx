'use client';

import { useRef } from 'react';
import { Upload, Video } from 'lucide-react';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
}

export default function VideoUpload({ onVideoUpload }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onVideoUpload(file);
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div
        className="flex flex-col items-center justify-center gap-6 border-2 border-dashed border-[#4a3010] rounded-2xl p-16 cursor-pointer hover:border-[#c9b600] transition-colors group"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-20 h-20 rounded-full bg-[#2d1a08] flex items-center justify-center group-hover:bg-[#3a2210] transition-colors">
          <Video size={36} className="text-[#c9b600]" />
        </div>
        <div className="text-center">
          <p className="text-[#e8d5a0] text-lg font-semibold mb-1">Drop your video here</p>
          <p className="text-[#7a6040] text-sm">or click to browse</p>
          <p className="text-[#5a4530] text-xs mt-2">MP4, MOV, WebM, AVI supported</p>
        </div>
        <button className="flex items-center gap-2 bg-[#c9b600] text-[#1a0c05] font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-[#e0cc00] transition-colors">
          <Upload size={16} />
          Upload Video
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
