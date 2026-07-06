'use client';

import { SubtitleChunk, Layer } from '@/types/editor';
import { FORMAT_RATIO } from './videoCanvas';
import { VideoFormat } from '@/types/editor';

interface PreviewCanvasProps {
  format: VideoFormat;
  currentTime: number;
  videoUrl: string;
  muted: boolean;
  activeSub: SubtitleChunk | null;
  subtitleFontFamily: string;
  subtitleFontScale: number;
  layers: Layer[];
  onRefReady: (node: HTMLVideoElement | null) => void;
  onTimeUpdate: () => void;
  onEnded: () => void;
  onClick: () => void;
}

export default function PreviewCanvas({
  format,
  currentTime,
  videoUrl,
  muted,
  activeSub,
  subtitleFontFamily,
  subtitleFontScale,
  layers,
  onRefReady,
  onTimeUpdate,
  onEnded,
  onClick,
}: PreviewCanvasProps) {
  const baseFontPx = Math.max(12, Math.round(18 * (subtitleFontScale / 100)));

  return (
    <div
      className="relative h-full w-full shrink-0 overflow-hidden bg-black"
      style={{ aspectRatio: FORMAT_RATIO[format], maxWidth: '100%' }}
    >
      <video
        ref={onRefReady}
        src={videoUrl}
        className="w-full h-full object-contain bg-black"
        muted={muted}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onClick={onClick}
      />
      {layers
        .filter((layer) => layer.type !== 'audio')
        .filter((layer) => currentTime >= layer.startTime && currentTime <= layer.endTime)
        .map((layer) => (
          <div
            key={layer.id}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              width: `${layer.width}%`,
              height: `${layer.height}%`,
              zIndex: layer.zIndex,
            }}
          >
            <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
              {layer.type === 'text' && (
                <div className="w-full h-full flex items-center justify-center text-center px-1" style={{ backgroundColor: layer.bgColor || '#00000000' }}>
                  <p
                    className="font-bold w-full break-words leading-normal"
                    style={{
                      fontSize: `${(layer.fontSize || 20) * 0.85}px`,
                      color: layer.color || '#ffffff',
                      fontFamily: layer.fontFamily || 'Inter, Arial, sans-serif',
                    }}
                  >
                    {layer.text || ''}
                  </p>
                </div>
              )}
              {layer.type === 'image' && layer.src && (
                <img src={layer.src} alt={layer.name} className="w-full h-full object-contain" />
              )}
              {layer.type === 'video' && layer.src && (
                <video src={layer.src} className="w-full h-full object-contain" muted={Boolean(layer.mediaMuted)} loop autoPlay playsInline />
              )}
            </div>
          </div>
        ))}

      {activeSub && (
        <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex justify-center px-4 sm:px-6 pointer-events-none" style={{ zIndex: 9999 }}>
          <div
            className="bg-black/70 text-white font-bold px-3 sm:px-4 py-2 rounded-xl text-center max-w-full shadow-lg"
            style={{ fontFamily: subtitleFontFamily, fontSize: `${baseFontPx}px` }}
          >
            {activeSub.text}
          </div>
        </div>
      )}
    </div>
  );
}
