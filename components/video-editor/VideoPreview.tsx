'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Play, Pause, SkipBack, Image as ImageIcon, Film as FilmIcon } from 'lucide-react';
import { SubtitleChunk, VideoFormat, Layer, LayerType } from '@/types/editor';

interface VideoPreviewProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  subtitles: SubtitleChunk[];
  format: VideoFormat;
  onPlayPause: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;

  // Canvas layer props
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (layer: Layer) => void;
  onAddLayerAtCoords: (type: Exclude<LayerType, 'audio'>, x: number, y: number) => void;
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

function getStageSize(video: HTMLVideoElement, format: VideoFormat) {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const targetRatio = FORMAT_RATIO[format];
  const videoRatio = vw / vh;

  if (targetRatio === videoRatio) {
    return { width: vw, height: vh };
  }

  if (targetRatio < videoRatio) {
    return { width: vw, height: Math.round(vw / targetRatio) };
  }

  return { width: Math.round(vh * targetRatio), height: vh };
}

/** Draw video centered on an expanded format canvas. */
function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement
) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);

  const videoRatio = vw / vh;
  const canvasRatio = cw / ch;
  let dw = cw;
  let dh = ch;

  if (canvasRatio > videoRatio) {
    dh = ch;
    dw = dh * videoRatio;
  } else {
    dw = cw;
    dh = dw / videoRatio;
  }

  ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
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

export default function VideoPreview({
  videoUrl,
  isPlaying,
  currentTime,
  subtitles,
  format,
  onPlayPause,
  onTimeUpdate,
  onDurationChange,
  videoRef,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onAddLayerAtCoords,
}: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const subsRef = useRef(subtitles);
  subsRef.current = subtitles;

  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !video || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stage = getStageSize(video, format);
    if (canvas.width !== stage.width || canvas.height !== stage.height) {
      canvas.width = stage.width;
      canvas.height = stage.height;
    }

    drawVideoFrame(ctx, video);

    const sub = getActiveSub(subsRef.current, video.currentTime);
    if (sub) drawSubtitleOverlay(ctx, sub.text);

    if (isPlaying) animRef.current = requestAnimationFrame(drawFrame);
  }, [videoRef, format, isPlaying]);

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
  }, [subtitles, format, isPlaying, drawFrame]);

  // Drag & drop layer creation
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const type = e.dataTransfer.getData('layerType') as Exclude<LayerType, 'audio'>;
    if (type) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onAddLayerAtCoords(type, Math.max(0, Math.min(90, x)), Math.max(0, Math.min(90, y)));
    }
  };

  // Drag & resize handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    layer: Layer,
    action: 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
  ) => {
    e.stopPropagation();
    onSelectLayer(layer.id);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;

    const startX = layer.x;
    const startY = layer.y;
    const startW = layer.width;
    const startH = layer.height;
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = ((moveEvent.clientX - startMouseX) / containerW) * 100;
      const deltaY = ((moveEvent.clientY - startMouseY) / containerH) * 100;

      if (action === 'move') {
        const nextX = Math.max(0, Math.min(100 - startW, startX + deltaX));
        const nextY = Math.max(0, Math.min(100 - startH, startY + deltaY));
        onUpdateLayer({ ...layer, x: nextX, y: nextY });
      } else {
        let nextX = layer.x;
        let nextY = layer.y;
        let nextW = layer.width;
        let nextH = layer.height;

        if (action === 'resize-br') {
          nextW = Math.max(5, Math.min(100 - startX, startW + deltaX));
          nextH = Math.max(5, Math.min(100 - startY, startH + deltaY));
        } else if (action === 'resize-bl') {
          const possibleW = startW - deltaX;
          if (possibleW > 5 && startX + deltaX >= 0) {
            nextX = startX + deltaX;
            nextW = possibleW;
          }
          nextH = Math.max(5, Math.min(100 - startY, startH + deltaY));
        } else if (action === 'resize-tr') {
          nextW = Math.max(5, Math.min(100 - startX, startW + deltaX));
          const possibleH = startH - deltaY;
          if (possibleH > 5 && startY + deltaY >= 0) {
            nextY = startY + deltaY;
            nextH = possibleH;
          }
        } else if (action === 'resize-tl') {
          const possibleW = startW - deltaX;
          if (possibleW > 5 && startX + deltaX >= 0) {
            nextX = startX + deltaX;
            nextW = possibleW;
          }
          const possibleH = startH - deltaY;
          if (possibleH > 5 && startY + deltaY >= 0) {
            nextY = startY + deltaY;
            nextH = possibleH;
          }
        }

        onUpdateLayer({
          ...layer,
          x: nextX,
          y: nextY,
          width: nextW,
          height: nextH,
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // If click directly on container/canvas, deselect layer
    if (e.target === e.currentTarget || e.target === canvasRef.current) {
      onSelectLayer(null);
      setEditingTextId(null);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2 min-h-0">
      {/* Format row */}
      <div className="flex items-center gap-2 h-5 shrink-0">
        <span className="ml-auto text-[10px] text-[#5a4530] font-mono">{format}</span>
      </div>

      {/* Canvas stage */}
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <div
          ref={containerRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={handleContainerClick}
          className="relative bg-black rounded-xl overflow-hidden max-h-full max-w-full group shadow-[0_18px_80px_rgba(0,0,0,0.45)] w-full"
          style={{ aspectRatio: FORMAT_RATIO[format], maxWidth: '100%', maxHeight: '100%' }}
        >
          <canvas ref={canvasRef} className="w-full h-full block object-contain pointer-events-none" />

          {/* Interactive Canvas Layers */}
          {layers
            .filter((layer) => layer.type !== 'audio')
            .filter((layer) => currentTime >= layer.startTime && currentTime <= layer.endTime)
            .map((layer) => {
            const isSelected = selectedLayerId === layer.id;
            const isEditing = editingTextId === layer.id;

            return (
              <div
                key={layer.id}
                onMouseDown={(e) => handleMouseDown(e, layer, 'move')}
                className={`absolute select-none group/layer ${
                  isSelected
                    ? 'border-2 border-[#c9b600] ring-1 ring-black/40'
                    : 'border border-dashed border-[#c9b600]/30 hover:border-[#c9b600]/75'
                }`}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: `${layer.height}%`,
                  zIndex: layer.zIndex,
                  cursor: isSelected ? 'move' : 'pointer',
                }}
              >
                {/* Content Renderer */}
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                  {layer.type === 'text' && (
                    <div
                      className="w-full h-full flex items-center justify-center text-center px-1"
                      style={{ backgroundColor: layer.bgColor || '#00000000' }}
                    >
                      {isEditing ? (
                        <textarea
                          autoFocus
                          value={layer.text || ''}
                          onChange={(e) => onUpdateLayer({ ...layer, text: e.target.value })}
                          onBlur={() => setEditingTextId(null)}
                          className="w-full h-full bg-transparent border-none outline-none resize-none font-bold text-center leading-normal"
                          style={{
                            fontSize: `${layer.fontSize || 20}px`,
                            color: layer.color || '#ffffff',
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <p
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingTextId(layer.id);
                          }}
                          className="font-bold select-none cursor-text w-full break-words leading-normal"
                          style={{
                            fontSize: `${layer.fontSize || 20}px`,
                            color: layer.color || '#ffffff',
                          }}
                        >
                          {layer.text || 'Double click to edit'}
                        </p>
                      )}
                    </div>
                  )}

                  {layer.type === 'image' && (
                    layer.src ? (
                      <img
                        src={layer.src}
                        alt={layer.name}
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#241508] to-[#120a02] flex flex-col items-center justify-center text-[#c9b600] border border-[#3d2510] gap-1 p-2">
                        <ImageIcon size={22} className="opacity-80" />
                        <span className="text-[10px] font-semibold opacity-85 text-center truncate w-full">{layer.name}</span>
                        <span className="text-[8px] text-[#7a6040] text-center hidden group-hover/layer:block">Upload in sidebar</span>
                      </div>
                    )
                  )}

                  {layer.type === 'video' && (
                    layer.src ? (
                      <video
                        src={layer.src}
                        className="w-full h-full object-contain pointer-events-none"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#241508] to-[#120a02] flex flex-col items-center justify-center text-[#c9b600] border border-[#3d2510] gap-1 p-2">
                        <FilmIcon size={22} className="opacity-80 animate-pulse" />
                        <span className="text-[10px] font-semibold opacity-85 text-center truncate w-full">{layer.name}</span>
                        <span className="text-[8px] text-[#7a6040] text-center hidden group-hover/layer:block">Upload in sidebar</span>
                      </div>
                    )
                  )}
                </div>

                {/* Resize Handles (Only show when selected) */}
                {isSelected && (
                  <>
                    {/* Top Left */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, layer, 'resize-tl')}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nwse-resize z-10 hover:bg-[#c9b600]"
                    />
                    {/* Top Right */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, layer, 'resize-tr')}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nesw-resize z-10 hover:bg-[#c9b600]"
                    />
                    {/* Bottom Left */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, layer, 'resize-bl')}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nesw-resize z-10 hover:bg-[#c9b600]"
                    />
                    {/* Bottom Right */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, layer, 'resize-br')}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#1a0c05] rounded-full cursor-nwse-resize z-10 hover:bg-[#c9b600]"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Quick Play/Pause overlay click */}
          <button
            onClick={onPlayPause}
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/15 pointer-events-none group-hover:pointer-events-auto"
            style={{ zIndex: 0 }}
          >
            {/* Direct click on button will play/pause, doesn't interfere with layers because layers have higher z-index */}
            <div className="w-14 h-14 rounded-full bg-black/55 flex items-center justify-center pointer-events-auto">
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
