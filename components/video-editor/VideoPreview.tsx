'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Play, Pause, SkipBack, Trash2 } from 'lucide-react';
import { SubtitleChunk, VideoFormat, Layer, ImageLayer, TextLayer } from '@/types/editor';

interface VideoPreviewProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  bgBlurEnabled: boolean;
  noiseRemoveApplied: boolean;
  subtitles: SubtitleChunk[];
  format: VideoFormat;
  layers: Layer[];
  selectedLayerId: string | null;
  onPlayPause: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onSelectLayer: (layerId: string | null) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const FORMAT_RATIO: Record<VideoFormat, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function getActiveSub(subtitles: SubtitleChunk[], t: number): SubtitleChunk | null {
  return subtitles.find((c) => t >= c.startTime && t <= c.endTime) ?? null;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Draw video frame onto canvas with format cropping */
function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  format: VideoFormat,
  bgBlur: boolean
) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);

  if (bgBlur) {
    ctx.save();
    ctx.filter = 'blur(22px)';
    ctx.drawImage(video, -24, -24, cw + 48, ch + 48);
    ctx.restore();
  }

  // Determine source crop based on format
  let sx = 0, sy = 0, sw = vw, sh = vh;
  const targetRatio = FORMAT_RATIO[format];
  const videoRatio = vw / vh;

  if (Math.abs(videoRatio - targetRatio) > 0.01) {
    if (videoRatio > targetRatio) {
      // Video wider → crop sides
      sw = Math.round(vh * targetRatio);
      sx = Math.round((vw - sw) / 2);
    } else {
      // Video taller → crop top/bottom
      sh = Math.round(vw / targetRatio);
      sy = Math.round((vh - sh) / 2);
    }
  }

  if (bgBlur) {
    // In blur mode draw a centered portrait strip
    const pw = cw * 0.56;
    const ph = ch;
    ctx.drawImage(video, sx, sy, sw, sh, (cw - pw) / 2, (ch - ph) / 2, pw, ph);
  } else {
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  }
}

/** Draw subtitle text overlay */
function drawSubtitleOverlay(ctx: CanvasRenderingContext2D, text: string) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const fs = Math.round(ch * 0.065);
  ctx.font = `bold ${fs}px Inter, Arial, sans-serif`;
  const padH = cw * 0.06;
  const lines = wrapText(ctx, text, cw - padH * 2);
  const lineH = fs * 1.35;
  const boxH = lineH * lines.length + fs * 0.7;
  const boxY = ch - boxH - ch * 0.04;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  roundRect(ctx, padH * 0.5, boxY - fs * 0.2, cw - padH, boxH, fs * 0.4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  lines.forEach((line, i) => {
    ctx.fillText(line, cw / 2, boxY + fs * 0.35 + i * lineH + lineH / 2);
  });
  ctx.restore();
}

/** Draw "NR" badge when noise remove is applied */
function drawNRBadge(ctx: CanvasRenderingContext2D) {
  const cw = ctx.canvas.width;
  const fs = Math.round(cw * 0.024);
  const pad = fs * 0.5;
  const label = 'NR';
  ctx.font = `bold ${fs}px Inter, Arial, sans-serif`;
  const tw = ctx.measureText(label).width;
  const bw = tw + pad * 2;
  const bh = fs + pad * 1.2;
  const bx = cw - bw - Math.round(cw * 0.015);
  const by = Math.round(ctx.canvas.height * 0.015);

  ctx.save();
  ctx.fillStyle = '#22c55e';
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bw / 2, by + bh / 2);
  ctx.restore();
}

export default function VideoPreview({
  videoUrl,
  isPlaying,
  currentTime,
  bgBlurEnabled,
  noiseRemoveApplied,
  subtitles,
  format,
  layers,
  selectedLayerId,
  onPlayPause,
  onTimeUpdate,
  onDurationChange,
  onUpdateLayer,
  onSelectLayer,
  videoRef,
}: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const subsRef = useRef(subtitles);
  subsRef.current = subtitles;

  const [dragState, setDragState] = useState<{
    layerId: string;
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    startX2?: number;
    startY2?: number;
    startW?: number;
    startH?: number;
  } | null>(null);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !video || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution based on format
    const ratio = FORMAT_RATIO[format];
    const baseH = video.videoHeight || 720;
    const baseW = Math.round(baseH * ratio);
    if (canvas.width !== baseW || canvas.height !== baseH) {
      canvas.width = baseW;
      canvas.height = baseH;
    }

    drawVideoFrame(ctx, video, format, bgBlurEnabled);

    const sub = getActiveSub(subsRef.current, video.currentTime);
    if (sub) drawSubtitleOverlay(ctx, sub.text);

    if (noiseRemoveApplied) drawNRBadge(ctx);

    if (isPlaying) animRef.current = requestAnimationFrame(drawFrame);
  }, [videoRef, format, bgBlurEnabled, noiseRemoveApplied, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(drawFrame);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setTimeout(() => drawFrame(), 30);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying, drawFrame]);

  // Redraw on subtitle/format changes while paused
  useEffect(() => {
    if (!isPlaying) setTimeout(() => drawFrame(), 30);
  }, [subtitles, format, bgBlurEnabled, noiseRemoveApplied, isPlaying, drawFrame]);

  // Get active layers for current time
  const activeLayersForTime = layers.filter(
    (layer) => currentTime >= layer.startTime && currentTime <= layer.endTime
  );

  // Mouse handlers for layer drag/resize
  const handleLayerMouseDown = (e: React.MouseEvent, layerId: string, mode: 'move' | 'resize') => {
    if (mode === 'resize') e.stopPropagation();
    e.preventDefault();
    onSelectLayer(layerId);

    const container = canvasContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;

    setDragState({
      layerId,
      mode,
      startX: x,
      startY: y,
      ...(mode === 'resize' && layer.type !== 'audio'
        ? {
            startX2: (layer as ImageLayer | TextLayer).width,
            startY2: (layer as ImageLayer | TextLayer).height,
          }
        : {}),
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState) return;

      const container = canvasContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const dx = x - dragState.startX;
      const dy = y - dragState.startY;

      const layer = layers.find((l) => l.id === dragState.layerId);
      if (!layer) return;

      if (dragState.mode === 'move' && layer.type !== 'audio') {
        const imageLayer = layer as ImageLayer | TextLayer;
        onUpdateLayer(dragState.layerId, {
          x: imageLayer.x + dx,
          y: imageLayer.y + dy,
        });
      } else if (dragState.mode === 'resize' && layer.type !== 'audio') {
        const imageLayer = layer as ImageLayer | TextLayer;
        onUpdateLayer(dragState.layerId, {
          width: Math.max(50, (dragState.startX2 || 0) + dx),
          height: Math.max(50, (dragState.startY2 || 0) + dy),
        });
      }

      setDragState((prev) =>
        prev ? { ...prev, startX: x, startY: y } : null
      );
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, layers, onUpdateLayer]);

  return (
    <div className="flex flex-col h-full gap-2 min-h-0">
      {/* Badges row */}
      <div className="flex items-center gap-2 h-5 shrink-0">
        {bgBlurEnabled && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#c9b600] text-[#1a0c05]">
            BG Blur ON
          </span>
        )}
        {noiseRemoveApplied && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-600 text-white">
            Noise Removed
          </span>
        )}
        <span className="ml-auto text-[10px] text-[#5a4530] font-mono">{format}</span>
      </div>

      {/* Canvas — aspect ratio constrained */}
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <div
          ref={canvasContainerRef}
          className="relative bg-black rounded-xl overflow-hidden max-h-full max-w-full"
          style={{ aspectRatio: FORMAT_RATIO[format], height: '100%' }}
          onClick={() => !selectedLayerId && onSelectLayer(null)}
        >
          <canvas ref={canvasRef} className="w-full h-full block object-contain" />

          {/* Render layers */}
          {activeLayersForTime.map((layer) => (
            <div
              key={layer.id}
              onMouseDown={(e) => handleLayerMouseDown(e, layer.id, 'move')}
              className={`absolute cursor-move transition-opacity ${
                selectedLayerId === layer.id ? 'opacity-100 ring-2 ring-[#c9b600]' : 'opacity-75 hover:opacity-100'
              }`}
              style={{
                left: layer.type !== 'audio' ? `${(layer as ImageLayer | TextLayer).x}px` : 0,
                top: layer.type !== 'audio' ? `${(layer as ImageLayer | TextLayer).y}px` : 0,
                width: layer.type !== 'audio' ? `${(layer as ImageLayer | TextLayer).width}px` : 'auto',
                height: layer.type !== 'audio' ? `${(layer as ImageLayer | TextLayer).height}px` : 'auto',
                opacity: layer.type !== 'audio' ? (layer as ImageLayer | TextLayer).opacity : 1,
                zIndex: layer.zIndex,
              }}
            >
              {layer.type === 'image' && (
                <img
                  src={(layer as ImageLayer).src}
                  alt="overlay"
                  className="w-full h-full object-cover pointer-events-none"
                  style={{
                    borderRadius: `${(layer as ImageLayer).borderRadius}px`,
                    border: (layer as ImageLayer).borderWidth > 0 ? `${(layer as ImageLayer).borderWidth}px solid ${(layer as ImageLayer).borderColor}` : 'none',
                    transform: `scale(${(layer as ImageLayer).scale}) rotate(${(layer as ImageLayer).rotation}deg)`,
                  }}
                />
              )}
              {layer.type === 'text' && (
                <div
                  className="w-full h-full flex items-center justify-center pointer-events-none overflow-hidden"
                  style={{
                    fontSize: `${(layer as TextLayer).fontSize}px`,
                    color: (layer as TextLayer).color,
                    fontFamily: (layer as TextLayer).fontFamily,
                    fontWeight: (layer as TextLayer).fontWeight === 'normal' ? 'normal' : (layer as TextLayer).fontWeight === 'bold' ? 'bold' : '900',
                    textAlign: (layer as TextLayer).textAlign,
                    padding: `${(layer as TextLayer).padding}px`,
                    borderRadius: `${(layer as TextLayer).borderRadius}px`,
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    backgroundColor: `rgba(${parseInt((layer as TextLayer).backgroundColor.slice(1, 3), 16)}, ${parseInt((layer as TextLayer).backgroundColor.slice(3, 5), 16)}, ${parseInt((layer as TextLayer).backgroundColor.slice(5, 7), 16)}, ${(layer as TextLayer).backgroundOpacity})`,
                  }}
                >
                  {(layer as TextLayer).text}
                </div>
              )}

              {/* Resize handle for selected layer */}
              {selectedLayerId === layer.id && layer.type !== 'audio' && (
                <div
                  onMouseDown={(e) => handleLayerMouseDown(e, layer.id, 'resize')}
                  className="absolute bottom-0 right-0 w-3 h-3 bg-[#c9b600] cursor-nwse-resize"
                  style={{ transform: 'translate(50%, 50%)' }}
                />
              )}
            </div>
          ))}

          <button
            onClick={onPlayPause}
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/15 pointer-events-none hover:pointer-events-auto"
          >
            <div className="w-14 h-14 rounded-full bg-black/55 flex items-center justify-center">
              {isPlaying
                ? <Pause size={24} className="text-white" />
                : <Play size={24} className="text-white ml-1" />}
            </div>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 shrink-0 px-1">
        <button
          onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}
          className="text-[#7a6040] hover:text-[#c9b600] transition-colors"
        >
          <SkipBack size={15} />
        </button>
        <button
          onClick={onPlayPause}
          className="w-8 h-8 rounded-full bg-[#c9b600] text-[#1a0c05] flex items-center justify-center hover:bg-[#e0cc00] transition-colors shrink-0"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
        </button>
        <span className="text-[#7a6040] text-xs font-mono">{formatTime(currentTime)}</span>
      </div>

      {/* Hidden video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        onLoadedData={() => setTimeout(() => drawFrame(), 50)}
        onSeeked={() => setTimeout(() => drawFrame(), 30)}
      />
    </div>
  );
}
