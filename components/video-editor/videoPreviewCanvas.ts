import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FORMAT_RATIO, drawSubtitleOverlay, getActiveSub, getCanvasSize, wrapText } from './videoCanvas';
import { calcDragDelta, buildDraggedLayerRect } from './videoCanvasGeometry';
import { CanvasObject, Layer, LayerType, MediaAsset, TimelineClip } from '@/types/editor';
import {
  LayerDragAction,
  LayerDragState,
  PreviewCanvasController,
  UseVideoCanvasControllerArgs,
} from './videoCanvasController';
import { getTimelineStackItems, isClipActive, shouldRenderAsset, sourceTimeForClip } from './timelineModel';

type ImageCache = Map<string, HTMLImageElement>;
interface VideoDecoder {
  video: HTMLVideoElement;
  token: number;
  lastFrame?: HTMLCanvasElement;
}
type VideoCache = Map<string, VideoDecoder>;
type DragHit =
  | { kind: 'object'; item: CanvasObject; action: LayerDragAction }
  | { kind: 'layer'; item: Layer; action: LayerDragAction };

const background = '#050301';
const handleSize = 9;

function isCanvasObject(item: Layer | CanvasObject): item is CanvasObject {
  return 'drawOrder' in item;
}

function rectForObject(item: Pick<Layer | CanvasObject, 'x' | 'y' | 'width' | 'height'>, canvas: HTMLCanvasElement) {
  return {
    x: (item.x / 100) * canvas.width,
    y: (item.y / 100) * canvas.height,
    width: (item.width / 100) * canvas.width,
    height: (item.height / 100) * canvas.height,
  };
}

function getSourceDimensions(source: CanvasImageSource) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth || source.width, height: source.naturalHeight || source.height };
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }
  return null;
}

function drawSelection(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; width: number; height: number }) {
  ctx.save();
  ctx.strokeStyle = '#c9b600';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffffff';
  const handles = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ];
  handles.forEach(([x, y]) => {
    ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
  });
  ctx.restore();
}

function getHandleAction(
  rect: { x: number; y: number; width: number; height: number },
  x: number,
  y: number
): LayerDragAction | null {
  const hit = handleSize * 1.6;
  const near = (px: number, py: number) => Math.abs(x - px) <= hit && Math.abs(y - py) <= hit;
  if (near(rect.x, rect.y)) return 'resize-tl';
  if (near(rect.x + rect.width, rect.y)) return 'resize-tr';
  if (near(rect.x, rect.y + rect.height)) return 'resize-bl';
  if (near(rect.x + rect.width, rect.y + rect.height)) return 'resize-br';
  return null;
}

function captureVideoFrame(video: HTMLVideoElement, existing?: HTMLCanvasElement) {
  if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return existing;
  const frame = existing ?? document.createElement('canvas');
  if (frame.width !== video.videoWidth || frame.height !== video.videoHeight) {
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
  }
  const frameCtx = frame.getContext('2d');
  if (frameCtx) frameCtx.drawImage(video, 0, 0, frame.width, frame.height);
  return frame;
}

function drawMissingMedia(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; width: number; height: number }, label: string) {
  ctx.save();
  ctx.fillStyle = '#241508';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeStyle = '#4a3010';
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.fillStyle = '#c9b600';
  ctx.font = '600 14px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.restore();
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: Layer) {
  const rect = rectForObject(layer, ctx.canvas);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = layer.bgColor || '#00000000';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  const fontSize = Math.max(8, (layer.fontSize || 20) * (ctx.canvas.width / 960));
  ctx.font = `700 ${fontSize}px ${layer.fontFamily || 'Inter, Arial, sans-serif'}`;
  ctx.fillStyle = layer.color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(ctx, layer.text || 'Double click to edit text', Math.max(20, rect.width - 12));
  const lineHeight = fontSize * 1.25;
  const top = rect.y + rect.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, rect.x + rect.width / 2, top + index * lineHeight);
  });
  ctx.restore();
}

function getActiveNonAudioLayers(layers: Layer[], currentTime: number) {
  return layers.filter(
    (layer) => layer.type !== 'audio' && currentTime >= layer.startTime && currentTime <= layer.endTime
  );
}

function getRenderableClipsForAssets(
  clips: TimelineClip[],
  assetById: Map<string, MediaAsset>,
  currentTime: number
) {
  return clips.filter((clip) => isClipActive(clip, currentTime) && shouldRenderAsset(assetById.get(clip.assetId)));
}

export function useVideoCanvasController({
  isPlaying,
  subtitles,
  format,
  subtitleFontScale,
  subtitleFontFamily,
  onUpdateLayer,
  onAddLayerAtCoords,
  onSelectLayer,
  onSelectClip,
  layers,
  mediaAssets,
  timelineClips,
  canvasObjects,
  selectedLayerId,
  selectedClipId,
  selectedCanvasObjectId,
  currentTime,
  onUpdateCanvasObject,
  audioMuted,
  playbackRate,
}: UseVideoCanvasControllerArgs): PreviewCanvasController {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const imageCacheRef = useRef<ImageCache>(new Map());
  const videoCacheRef = useRef<VideoCache>(new Map());
  const drawFrameRef = useRef<() => void>(() => undefined);
  const renderTokenRef = useRef(0);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const deployedAssetById = useMemo(() => new Map(mediaAssets.map((asset) => [asset.id, asset])), [mediaAssets]);

  const measureCanvas = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const next = getCanvasSize(1280, 720, format, rect.width, rect.height);
    setStageSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
  }, [format]);

  const getImage = useCallback((assetId: string, url: string) => {
    const cache = imageCacheRef.current;
    const cached = cache.get(assetId);
    if (cached) return cached;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => drawFrameRef.current();
    cache.set(assetId, img);
    return img;
  }, []);

  const getVideo = useCallback((clipId: string, url: string) => {
    const cache = videoCacheRef.current;
    const cached = cache.get(clipId);
    if (cached) return cached;
    const video = document.createElement('video');
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.src = url;
    video.onseeked = () => drawFrameRef.current();
    video.oncanplay = () => drawFrameRef.current();
    const entry: VideoDecoder = { video, token: 0 };
    cache.set(clipId, entry);
    return entry;
  }, []);

  const drawCanvasObject = useCallback((
    ctx: CanvasRenderingContext2D,
    object: CanvasObject,
    drawSource: CanvasImageSource | null,
    fallbackLabel: string
  ) => {
    const rect = rectForObject(object, ctx.canvas);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, object.opacity));
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.rotate(((object.rotation || 0) * Math.PI) / 180);
    ctx.scale(object.scaleX || 1, object.scaleY || 1);
    if (drawSource) {
      const sourceSize = getSourceDimensions(drawSource);
      if (sourceSize?.width && sourceSize?.height) {
        const fitScale = Math.min(rect.width / sourceSize.width, rect.height / sourceSize.height);
        const drawWidth = Math.max(1, sourceSize.width * fitScale);
        const drawHeight = Math.max(1, sourceSize.height * fitScale);
        ctx.drawImage(drawSource, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      } else {
        ctx.drawImage(drawSource, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
      }
    } else {
      drawMissingMedia(ctx, { x: -rect.width / 2, y: -rect.height / 2, width: rect.width, height: rect.height }, fallbackLabel);
    }
    ctx.restore();
    if (object.selected || selectedCanvasObjectId === object.id || selectedClipId === object.clipId) {
      drawSelection(ctx, rect);
    }
  }, [selectedCanvasObjectId, selectedClipId]);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const measured =
      stageSize.width && stageSize.height
        ? stageSize
        : getCanvasSize(1280, 720, format, viewport?.clientWidth, viewport?.clientHeight);

    if (canvas.width !== measured.width || canvas.height !== measured.height) {
      canvas.width = measured.width;
      canvas.height = measured.height;
    }

    renderTokenRef.current += 1;
    const renderToken = renderTokenRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const activeClips = getRenderableClipsForAssets(timelineClips, deployedAssetById, currentTime);
    const activeClipIds = new Set(activeClips.map((clip) => clip.id));
    const activeLayers = getActiveNonAudioLayers(layers, currentTime);
    const renderItems = getTimelineStackItems(activeLayers, activeClips, canvasObjects).reverse();

    videoCacheRef.current.forEach((decoder, cacheId) => {
      if (activeClipIds.has(cacheId)) return;
      const hiddenVideo = decoder.video;
      if (!hiddenVideo.paused) hiddenVideo.pause();
      hiddenVideo.muted = true;
      hiddenVideo.volume = 0;
    });

    renderItems.forEach((item) => {
      if (item.kind === 'clip') {
        const { clip, object } = item;
        const asset = deployedAssetById.get(clip.assetId);
        if (!asset) return;
        if (asset.type === 'image') {
          const image = getImage(asset.id, asset.url);
          drawCanvasObject(ctx, object, image.complete ? image : null, 'Loading image');
          return;
        }

        const decoder = getVideo(clip.id, asset.url);
        const desired = sourceTimeForClip(clip, currentTime);
        const video = decoder.video;
        const muted = Boolean(audioMuted || clip.muted);
        video.muted = muted;
        video.volume = muted ? 0 : Math.max(0, Math.min(1, clip.volume));
        video.playbackRate = playbackRate;
        const maxDrift = isPlaying ? 0.18 : 0.03;
        if (Math.abs(video.currentTime - desired) > maxDrift && Number.isFinite(desired)) {
          decoder.token = renderToken;
          try {
            video.currentTime = Math.max(0, Math.min(desired, asset.duration || desired));
          } catch {
            // Browser decoders can reject seeks while metadata is still settling; the next render retries.
          }
        }
        if (isPlaying) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
        if (video.readyState >= 2) decoder.lastFrame = captureVideoFrame(video, decoder.lastFrame);
        const source = video.readyState >= 2 && !video.seeking ? video : decoder.lastFrame ?? null;
        drawCanvasObject(ctx, object, source, 'Loading video');
        return;
      }

      const layer = item.layer;
      if (layer.type === 'text') {
        drawTextLayer(ctx, layer);
      } else if (layer.src) {
        const image = getImage(layer.id, layer.src);
        const object: CanvasObject = {
          id: layer.id,
          type: layer.type === 'video' ? 'video' : 'image',
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          selected: false,
          drawOrder: layer.zIndex,
        };
        drawCanvasObject(ctx, object, image.complete ? image : null, layer.type);
      } else {
        drawMissingMedia(ctx, rectForObject(layer, canvas), layer.name);
      }
      if (layer.id === selectedLayerId) {
        drawSelection(ctx, rectForObject(layer, canvas));
      }
    });

    const activeSub = getActiveSub(subtitles, currentTime);
    if (activeSub) {
      drawSubtitleOverlay(ctx, activeSub.text, { fontFamily: subtitleFontFamily, scalePercent: subtitleFontScale });
    }
  }, [
    audioMuted,
    canvasObjects,
    currentTime,
    deployedAssetById,
    drawCanvasObject,
    format,
    getImage,
    getVideo,
    isPlaying,
    layers,
    playbackRate,
    selectedLayerId,
    stageSize,
    subtitleFontFamily,
    subtitleFontScale,
    subtitles,
    timelineClips,
  ]);

  useEffect(() => {
    drawFrameRef.current = drawFrame;
  }, [drawFrame]);

  const hitTest = useCallback((clientX: number, clientY: number): DragHit | null => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return null;
    const bounds = container.getBoundingClientRect();
    const x = ((clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((clientY - bounds.top) / bounds.height) * canvas.height;

    const activeLayers = getActiveNonAudioLayers(layers, currentTime);
    const activeClips = getRenderableClipsForAssets(timelineClips, deployedAssetById, currentTime);
    const hitItems = getTimelineStackItems(activeLayers, activeClips, canvasObjects);

    for (const item of hitItems) {
      if (item.kind === 'clip') {
        const rect = rectForObject(item.object, canvas);
        if (item.object.id === selectedCanvasObjectId || item.object.clipId === selectedClipId) {
          const handleAction = getHandleAction(rect, x, y);
          if (handleAction) return { kind: 'object', item: item.object, action: handleAction };
        }
        if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
          return { kind: 'object', item: item.object, action: 'move' };
        }
      } else {
        const rect = rectForObject(item.layer, canvas);
        if (item.layer.id === selectedLayerId) {
          const handleAction = getHandleAction(rect, x, y);
          if (handleAction) return { kind: 'layer', item: item.layer, action: handleAction };
        }
        if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
          return { kind: 'layer', item: item.layer, action: 'move' };
        }
      }
    }
    return null;
  }, [canvasObjects, currentTime, deployedAssetById, layers, selectedCanvasObjectId, selectedClipId, selectedLayerId, timelineClips]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const type = e.dataTransfer.getData('layerType') as Exclude<LayerType, 'audio'>;
    if (!rect || !type) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddLayerAtCoords(type, Math.max(0, Math.min(90, x)), Math.max(0, Math.min(90, y)));
  };

  const handleLayerMouseDown = (e: React.PointerEvent, item: Layer | CanvasObject, action: LayerDragAction) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    if (isCanvasObject(item)) {
      onSelectClip(item.clipId ?? null);
    } else {
      onSelectLayer(item.id);
    }
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dragState: LayerDragState = {
      containerW: rect.width,
      containerH: rect.height,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: item.x,
      startY: item.y,
      startW: item.width,
      startH: item.height,
    };

    const pointerId = e.pointerId;
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const { deltaX, deltaY } = calcDragDelta(moveEvent, dragState);
      const next = buildDraggedLayerRect(item as Layer, action, dragState, deltaX, deltaY);
      if (isCanvasObject(item)) onUpdateCanvasObject({ ...item, ...next });
      else onUpdateLayer({ ...item, ...next });
    };

    const onStop = (stopEvent: PointerEvent) => {
      if (stopEvent.pointerId !== pointerId) return;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onStop);
      document.removeEventListener('pointercancel', onStop);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onStop);
    document.addEventListener('pointercancel', onStop);
  };

  const handleContainerClick = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (!hit) {
      onSelectLayer(null);
      onSelectClip(null);
      setEditingTextId(null);
      return;
    }
    if (hit.kind === 'object') {
      onSelectClip(hit.item.clipId ?? null);
      handleLayerMouseDown(e, hit.item, hit.action);
    } else {
      onSelectLayer(hit.item.id);
      handleLayerMouseDown(e, hit.item, hit.action);
    }
  };

  const handleTextChange = (id: string, text: string) => {
    const target = layers.find((layer) => layer.id === id);
    if (target) onUpdateLayer({ ...target, text });
  };

  const containerStyle =
    ({
      aspectRatio: FORMAT_RATIO[format],
      width: stageSize.width > 0 ? `min(100%, ${stageSize.width}px)` : '100%',
      height: 'auto',
      maxWidth: '100%',
      maxHeight: stageSize.height > 0 ? `${stageSize.height}px` : '100%',
    });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(measureCanvas);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [measureCanvas]);

  useEffect(() => measureCanvas(), [measureCanvas, format]);

  useEffect(() => {
    drawFrame();
  }, [drawFrame]);

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
    const imageCache = imageCacheRef.current;
    const videoCache = videoCacheRef.current;
    return () => {
      videoCache.forEach(({ video }) => {
        video.pause();
        video.removeAttribute('src');
        video.load();
      });
      imageCache.clear();
      videoCache.clear();
    };
  }, []);

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
