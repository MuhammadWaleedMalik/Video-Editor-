import { useCallback, useEffect, useRef, useState } from 'react';
import { FORMAT_RATIO, drawSubtitleOverlay, drawVideoFrame, getActiveSub, getCanvasSize } from './videoCanvas';
import {
  calcDragDelta,
  buildDraggedLayerRect,
} from './videoCanvasGeometry';
import { Layer, LayerType } from '@/types/editor';
import {
  LayerDragAction,
  LayerDragState,
  PreviewCanvasController,
  UseVideoCanvasControllerArgs,
} from './videoCanvasController';

export function useVideoCanvasController({
  videoRef,
  isPlaying,
  subtitles,
  format,
  subtitleFontScale,
  subtitleFontFamily,
  onUpdateLayer,
  onAddLayerAtCoords,
  onSelectLayer,
  layers,
  audioMuted,
  playbackRate,
}: UseVideoCanvasControllerArgs): PreviewCanvasController {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const measureCanvas = useCallback(() => {
    const video = videoRef.current;
    const viewport = viewportRef.current;
    if (!video || !viewport) return;
    const rect = viewport.getBoundingClientRect();
    const next = getCanvasSize(video.videoWidth || 1280, video.videoHeight || 720, format, rect.width, rect.height);
    setStageSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
  }, [format, videoRef]);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const measured =
      stageSize.width && stageSize.height
        ? stageSize
        : getCanvasSize(video.videoWidth || 1280, video.videoHeight || 720, format, viewport?.clientWidth, viewport?.clientHeight);

    if (canvas.width !== measured.width || canvas.height !== measured.height) {
      canvas.width = measured.width;
      canvas.height = measured.height;
    }

    drawVideoFrame(ctx, video);
    const activeSub = getActiveSub(subtitles, video.currentTime);
    if (activeSub) {
      drawSubtitleOverlay(ctx, activeSub.text, { fontFamily: subtitleFontFamily, scalePercent: subtitleFontScale });
    }
  }, [format, stageSize, subtitles, subtitleFontFamily, subtitleFontScale, videoRef]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const type = e.dataTransfer.getData('layerType') as Exclude<LayerType, 'audio'>;
    if (!rect || !type) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddLayerAtCoords(type, Math.max(0, Math.min(90, x)), Math.max(0, Math.min(90, y)));
  };

  const handleLayerMouseDown = (e: React.MouseEvent, layer: Layer, action: LayerDragAction) => {
    e.stopPropagation();
    onSelectLayer(layer.id);
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dragState: LayerDragState = {
      containerW: rect.width,
      containerH: rect.height,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: layer.x,
      startY: layer.y,
      startW: layer.width,
      startH: layer.height,
    };

    const onMove = (moveEvent: MouseEvent) => {
      const { deltaX, deltaY } = calcDragDelta(moveEvent, dragState);
      const next = buildDraggedLayerRect(layer, action, dragState, deltaX, deltaY);
      onUpdateLayer({ ...layer, ...next });
    };

    const onStop = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onStop);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onStop);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onSelectLayer(null);
      setEditingTextId(null);
    }
  };

  const handleTextChange = (id: string, text: string) => {
    const target = layers.find((layer) => layer.id === id);
    if (target) onUpdateLayer({ ...target, text });
  };

  const containerStyle =
    stageSize.width && stageSize.height
      ? {
          aspectRatio: FORMAT_RATIO[format],
          width: `${stageSize.width}px`,
          height: `${stageSize.height}px`,
          maxWidth: '100%',
          maxHeight: '100%',
        }
      : { aspectRatio: FORMAT_RATIO[format], width: '100%', maxWidth: '100%', maxHeight: '100%' };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(measureCanvas);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [measureCanvas]);

  useEffect(() => measureCanvas(), [measureCanvas, format]);

  useEffect(() => {
    if (!isPlaying) return;
    const step = () => {
      drawFrame();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame, isPlaying]);

  useEffect(() => {
    if (!isPlaying) setTimeout(() => drawFrame(), 30);
  }, [subtitles, format, subtitleFontScale, subtitleFontFamily, drawFrame, isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = audioMuted;
    }
  }, [videoRef, playbackRate, audioMuted]);

  return {
    canvasRef,
    viewportRef,
    containerRef,
    stageSize,
    editingTextId,
    containerStyle,
    setEditingTextId,
    measureCanvas,
    drawFrame,
    handleDrop,
    handleContainerClick,
    handleTextChange,
    handleLayerMouseDown,
  };
}
