import { Camera, Upload } from 'lucide-react';
import { RefObject } from 'react';
import { Layer } from '@/types/editor';
import BrowserVideoRecorder from './BrowserVideoRecorder';

interface LayerMediaSourceFieldsProps {
  layer: Layer;
  inputRef: RefObject<HTMLInputElement>;
  isRecorderOpen: boolean;
  isUploadOnly?: boolean;
  onBrowse: () => void;
  onSourceFile: (file: File) => void;
  onUrlChange: (value: string) => void;
  onRecorderOpen: () => void;
  onCapture: (file: File) => void;
  onRecorderClose: () => void;
}

export default function LayerMediaSourceFields({
  layer,
  inputRef,
  isRecorderOpen,
  isUploadOnly = false,
  onBrowse,
  onSourceFile,
  onUrlChange,
  onRecorderOpen,
  onCapture,
  onRecorderClose,
}: LayerMediaSourceFieldsProps) {
  const accepts = layer.type === 'audio' ? 'audio/*' : layer.type === 'image' ? 'image/*' : 'video/*';
  const isVideo = layer.type === 'video';

  return (
    <div className="flex flex-col gap-2">
      {isVideo && !isUploadOnly ? (
        <button
          onClick={onRecorderOpen}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#4a3010] bg-[#2d1a08] py-2.5 text-xs font-semibold text-[#c8b88a] transition-colors hover:border-[#c9b600]"
        >
          <Camera size={12} className="text-[#c9b600]" />
          <span>Choose Video Source</span>
        </button>
      ) : (
        <button
          onClick={onBrowse}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#4a3010] bg-[#2d1a08] py-2.5 text-xs font-semibold text-[#c8b88a] transition-colors hover:border-[#c9b600]"
        >
          <Upload size={12} className="text-[#c9b600]" />
          <span>Browse {layer.type === 'audio' ? 'Audio' : 'Image'} File</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accepts}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onSourceFile(file);
          e.currentTarget.value = '';
        }}
      />

      <label className="flex flex-col gap-1">
        <span className="text-[9px] text-[#5a4530]">Or paste direct URL</span>
        <input
          type="text"
          value={layer.src || ''}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com/asset..."
          className="bg-[#1f1005] border border-[#3d2510] rounded-lg px-2 py-1 text-xs text-[#e8d5a0] outline-none focus:border-[#c9b600]"
        />
      </label>

      {isVideo && !isUploadOnly && (
        <BrowserVideoRecorder
          isOpen={isRecorderOpen}
          title="Choose Layer Video"
          onClose={onRecorderClose}
          onBrowse={onSourceFile}
          onCapture={onCapture}
        />
      )}

      {layer.src && (
        <p className="text-[9px] text-green-500 font-medium text-center truncate">[OK] File linked successfully</p>
      )}
    </div>
  );
}
