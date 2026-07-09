'use client';

import { useRef, useState } from 'react';
import {
  ArrowLeft,
  Film as FilmIcon,
  Image as ImageIcon,
  Music,
  Paintbrush,
  Sliders,
  Type as TypeIcon,
  Upload,
  Volume2,
  VolumeX,
  Trash2,
} from 'lucide-react';
import { Layer } from '@/types/editor';
import LayerCommonFields from './LayerCommonFields';
import LayerMediaSourceFields from './LayerMediaSourceFields';
import LayerTextStyleFields from './LayerTextStyleFields';
import { buildLayerFromFile } from '@/lib/videoAssets';

interface LayerPropertiesPanelProps {
  layer: Layer;
  duration: number;
  onBack: () => void;
  onUpdate: (next: Layer) => void;
  onDelete: (id: string) => void;
}

export default function LayerPropertiesPanel({
  layer,
  duration,
  onBack,
  onUpdate,
  onDelete,
}: LayerPropertiesPanelProps) {
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  async function applySource(file: File) {
    onUpdate(await buildLayerFromFile(layer, file, duration));
  }

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-t border-[#3d2510] bg-[#120a02] scrollbar-thin xl:border-l xl:border-t-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#3d2510] shrink-0">
        <button
          onClick={onBack}
          className="text-[#7a6040] hover:text-[#c9b600] transition-colors p-1"
          title="Back to Subtitles"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-[#e8d5a0] text-sm font-bold flex items-center gap-1.5">
          {layer.type === 'text' && <TypeIcon size={14} className="text-[#c9b600]" />}
          {layer.type === 'image' && <ImageIcon size={14} className="text-[#c9b600]" />}
          {layer.type === 'video' && <FilmIcon size={14} className="text-[#c9b600]" />}
          {layer.type === 'audio' && <Music size={14} className="text-[#c9b600]" />}
          Layer Editor
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-[#7a6040] uppercase font-bold tracking-wider border-b border-[#3d2510]/50 pb-1">
            <Sliders size={11} />
            <span>Layer Details</span>
          </div>
          <LayerCommonFields layer={layer} onUpdate={onUpdate} />
        </div>

        {layer.type === 'text' ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[#7a6040] uppercase font-bold tracking-wider border-b border-[#3d2510]/50 pb-1">
              <Paintbrush size={11} />
              <span>Text Styling</span>
            </div>
            <LayerTextStyleFields layer={layer} onUpdate={onUpdate} />
          </div>
        ) : null}

        {(layer.type === 'image' || layer.type === 'video' || layer.type === 'audio') ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[#7a6040] uppercase font-bold tracking-wider border-b border-[#3d2510]/50 pb-1">
              <Upload size={11} />
              <span>Media Source</span>
            </div>
            <LayerMediaSourceFields
              layer={layer}
              inputRef={sourceInputRef}
              isRecorderOpen={showRecorder}
              isUploadOnly={layer.type === 'audio'}
              onBrowse={() => sourceInputRef.current?.click()}
              onRecorderOpen={() => setShowRecorder(true)}
              onSourceFile={(file) => {
                void applySource(file);
                sourceInputRef.current && (sourceInputRef.current.value = '');
              }}
              onUrlChange={(value) => onUpdate({ ...layer, src: value })}
              onCapture={(file) => {
                setShowRecorder(false);
                void applySource(file);
              }}
              onRecorderClose={() => setShowRecorder(false)}
            />
          </div>
        ) : null}

        {layer.type === 'video' && (
          <button
            type="button"
            onClick={() => onUpdate({ ...layer, mediaMuted: !layer.mediaMuted })}
            className="w-full flex items-center justify-center gap-2 bg-[#2d1a08] border border-[#4a3010] hover:border-[#c9b600] text-[#c8b88a] text-xs font-semibold py-2.5 rounded-lg transition-colors"
          >
            {layer.mediaMuted ? <VolumeX size={12} className="text-[#c9b600]" /> : <Volume2 size={12} className="text-[#c9b600]" />}
            <span>{layer.mediaMuted ? 'Sound Off' : 'Sound On'}</span>
          </button>
        )}

        <div className="flex-1" />
        <button
          onClick={() => onDelete(layer.id)}
          className="w-full flex items-center justify-center gap-2 bg-red-950/45 hover:bg-red-900/60 border border-red-900/60 text-red-300 text-xs font-semibold py-2.5 rounded-lg transition-colors mt-4"
        >
          <Trash2 size={13} />
          <span>{layer.type === 'text' ? 'Delete Text' : 'Delete Item'}</span>
        </button>
      </div>
    </aside>
  );
}
