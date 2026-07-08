'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Film, Image as ImageIcon, Layers, Loader2, Upload } from 'lucide-react';
import { Layer, LayerType, MediaAsset } from '@/types/editor';
import LayerTypeMenu, { ObjectType, OBJECT_TYPES } from './LayerTypeMenu';
import LayerTile from './LayerTile';

interface LeftSidebarProps {
  layers: Layer[];
  mediaAssets: MediaAsset[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (type: LayerType) => void;
  onDeleteLayer: (id: string) => void;
  onVideoUpload: (file: File) => void;
  onImageUpload: (file: File) => void;
  onPlaceAsset: (id: string) => void;
  isUploadingMedia: boolean;
  uploadError: string | null;
}

const assetThumbnailCache = new Map<string, string>();
const assetThumbnailRequests = new Map<string, Promise<string>>();
const MAX_ASSET_THUMBNAIL_CACHE_SIZE = 80;

function rememberAssetThumbnail(key: string, thumbnail: string) {
  if (assetThumbnailCache.has(key)) assetThumbnailCache.delete(key);
  assetThumbnailCache.set(key, thumbnail);
  while (assetThumbnailCache.size > MAX_ASSET_THUMBNAIL_CACHE_SIZE) {
    const oldest = assetThumbnailCache.keys().next().value;
    if (!oldest) break;
    assetThumbnailCache.delete(oldest);
  }
}

function waitForAssetVideoEvent(video: HTMLVideoElement, eventName: keyof HTMLVideoElementEventMap) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener('error', onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Video thumbnail failed.'));
    };
    video.addEventListener(eventName, onEvent, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

async function buildAssetThumbnail(asset: MediaAsset) {
  if (asset.type === 'image') return asset.url;

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = asset.url;

  try {
    await waitForAssetVideoEvent(video, 'loadeddata');
    try {
      video.currentTime = Math.min(0.1, Math.max(0, (asset.duration ?? 0) / 10));
      await waitForAssetVideoEvent(video, 'seeked');
    } catch {
      // Some browsers reject tiny seeks before enough metadata is available; loadeddata is still drawable.
    }

    if (video.videoWidth <= 0 || video.videoHeight <= 0) return '';
    const canvas = document.createElement('canvas');
    const targetWidth = 168;
    const targetHeight = 96;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const scale = Math.max(targetWidth / video.videoWidth, targetHeight / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    ctx.fillStyle = '#120902';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(video, (targetWidth - drawWidth) / 2, (targetHeight - drawHeight) / 2, drawWidth, drawHeight);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}

function requestAssetThumbnail(asset: MediaAsset) {
  const key = `${asset.id}|${asset.url}|${asset.duration ?? ''}`;
  const cached = assetThumbnailCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = assetThumbnailRequests.get(key);
  if (pending) return pending;

  const request = buildAssetThumbnail(asset)
    .then((thumbnail) => {
      if (thumbnail) rememberAssetThumbnail(key, thumbnail);
      return thumbnail;
    })
    .finally(() => {
      assetThumbnailRequests.delete(key);
    });
  assetThumbnailRequests.set(key, request);
  return request;
}

const AssetPreview = memo(function AssetPreview({ asset }: { asset: MediaAsset }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (asset.status !== 'deployed') {
      setThumbnail(null);
      return;
    }

    requestAssetThumbnail(asset)
      .then((nextThumbnail) => {
        if (!cancelled) setThumbnail(nextThumbnail || null);
      })
      .catch(() => {
        if (!cancelled) setThumbnail(null);
      });

    return () => {
      cancelled = true;
    };
  }, [asset]);

  if (asset.status !== 'deployed') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#160d05] text-[#7a6040]">
        {asset.status === 'uploading' ? <Loader2 size={18} className="animate-spin" /> : <Film size={18} />}
      </div>
    );
  }

  if (!thumbnail) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#160d05] text-[#7a6040]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <img src={thumbnail} alt={asset.originalFileName} className="h-full w-full object-cover" />;
});

export default function LeftSidebar({
  layers,
  mediaAssets,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onVideoUpload,
  onImageUpload,
  onPlaceAsset,
  isUploadingMedia,
  uploadError,
}: LeftSidebarProps) {
  const [activeType, setActiveType] = useState<ObjectType>('video');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const grouped = useMemo(() => ({
    image: layers.filter((layer) => layer.type === 'image'),
    video: layers.filter((layer) => layer.type === 'video'),
    text: layers.filter((layer) => layer.type === 'text'),
    audio: layers.filter((layer) => layer.type === 'audio'),
  }), [layers]);

  const activeMeta = useMemo(() => OBJECT_TYPES.find((entry) => entry.type === activeType), [activeType]);
  const activeList = grouped[activeType];
  const activeAssets = useMemo(
    () => mediaAssets.filter((asset) => asset.type === activeType),
    [activeType, mediaAssets]
  );
  const hasItems = activeList.length > 0;
  const ActiveIcon = activeMeta?.icon;
  const isMediaTab = activeType === 'video' || activeType === 'image';

  function handleFile(file: File | undefined, type: 'video' | 'image') {
    if (!file) return;
    if (type === 'video') onVideoUpload(file);
    else onImageUpload(file);
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[#3d2510] bg-[#160d05]">
        <div className="flex items-center gap-2 border-b border-[#3d2510] p-3">
          <Layers size={13} className="text-[#c9b600]" />
          <h2 className="text-[#e8d5a0] text-xs font-bold uppercase tracking-wider">
            Layer Objects
          </h2>
        </div>

        <div className="p-3 border-b border-[#3d2510]">
          <LayerTypeMenu activeType={activeType} onChange={setActiveType} />
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 scrollbar-thin">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-[#7a6040] font-semibold uppercase tracking-wider">
              {activeMeta?.title}
            </h3>
            {isMediaTab ? (
              <button
                type="button"
                onClick={() => (activeType === 'video' ? videoInputRef.current?.click() : imageInputRef.current?.click())}
                disabled={isUploadingMedia}
                className="text-[10px] flex items-center gap-1 text-[#c9b600] hover:text-[#f6e78a] disabled:opacity-50"
              >
                {isUploadingMedia ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                Upload
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAddLayer(activeType as LayerType)}
                className="text-[10px] flex items-center gap-1 text-[#c9b600] hover:text-[#f6e78a]"
              >
                <span>+</span> Add
              </button>
            )}
          </div>

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.currentTarget.files?.[0], 'video');
              e.currentTarget.value = '';
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.currentTarget.files?.[0], 'image');
              e.currentTarget.value = '';
            }}
          />
          {uploadError && isMediaTab ? (
            <p className="rounded border border-red-900/60 bg-red-950/30 p-2 text-[10px] text-red-200">{uploadError}</p>
          ) : null}

          {isMediaTab ? (
            activeAssets.length ? (
              <div className="grid grid-cols-1 gap-2">
                {activeAssets.map((asset) => {
                  const AssetIcon = asset.type === 'video' ? Film : ImageIcon;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      disabled={asset.status !== 'deployed'}
                      onClick={() => onPlaceAsset(asset.id)}
                      className="flex min-w-0 items-start gap-3 rounded-lg border border-[#3d2510] bg-[#241508] p-2 text-left text-[#c8b88a] hover:border-[#c9b600] disabled:opacity-60"
                      title={asset.status === 'deployed' ? 'Add to canvas and timeline' : asset.status}
                    >
                      <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-md border border-[#3d2510] bg-[#160d05]">
                        <AssetPreview asset={asset} />
                        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[#f3dd84]">
                          <AssetIcon size={11} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block line-clamp-2 text-[11px] font-semibold leading-tight">{asset.originalFileName}</span>
                        <span className="mt-1 block text-[9px] text-[#7a6040]">
                          {asset.status === 'deployed'
                            ? asset.type === 'video'
                              ? `${Math.round(asset.duration ?? 0)}s`
                              : 'Image asset'
                            : asset.status}
                        </span>
                        <span className="mt-2 inline-flex rounded bg-[#160d05] px-2 py-1 text-[9px] text-[#c9b600]">
                          Click to add
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (activeType === 'video' ? videoInputRef.current?.click() : imageInputRef.current?.click())}
                className="w-full rounded-lg border border-dashed border-[#3d2510] bg-[#241508] p-3 text-sm text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600]"
              >
                Upload your first {activeType}
              </button>
            )
          ) : hasItems ? (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
              {activeList.map((layer) => (
                <div key={layer.id} className="w-28 flex-none md:w-auto">
                  <LayerTile
                    layer={layer}
                    isSelected={selectedLayerId === layer.id}
                    onSelect={onSelectLayer}
                    onDelete={onDeleteLayer}
                    previewIcon={ActiveIcon ?? Layers}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddLayer(activeType as LayerType)}
                className="flex aspect-square w-28 flex-none flex-col items-center justify-center rounded-lg border border-dashed border-[#3d2510] bg-[#241508] text-[10px] text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600] md:w-auto"
              >
                + Add more
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddLayer(activeType as LayerType)}
              className="w-full rounded-lg border border-dashed border-[#3d2510] bg-[#241508] text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600] p-3 text-sm flex items-center justify-center gap-2"
            >
              Add your first {activeMeta?.title.toLowerCase().slice(0, -1) || 'item'}
            </button>
          )}
        </div>
      </aside>
  );
}
