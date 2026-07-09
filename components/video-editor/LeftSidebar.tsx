'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Film, Image as ImageIcon, Layers, Loader2, Music, Trash2, Type as TypeIcon, Upload } from 'lucide-react';
import { Layer, LayerType, MediaAsset, TextAsset } from '@/types/editor';
import BrowserVideoRecorder from './BrowserVideoRecorder';
import LayerTypeMenu, { ObjectType, OBJECT_TYPES } from './LayerTypeMenu';
import { MAX_TIMELINE_DURATION_SECONDS } from './timelineModel';

interface LeftSidebarProps {
  layers: Layer[];
  mediaAssets: MediaAsset[];
  textAssets: TextAsset[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (type: LayerType) => void;
  onDeleteLayer: (id: string) => void;
  onVideoUpload: (file: File) => void;
  onImageUpload: (file: File) => void;
  onAudioUpload: (file: File) => void;
  onPlaceAsset: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  onPlaceTextAsset: (id: string) => void;
  onDeleteTextAsset: (id: string) => void;
  isUploadingMedia: boolean;
  uploadError: string | null;
}

const assetThumbnailCache = new Map<string, string>();
const assetThumbnailRequests = new Map<string, Promise<string>>();
const MAX_ASSET_THUMBNAIL_CACHE_SIZE = 80;
const SIDEBAR_LIST_CLASSNAME =
  'grid max-h-[min(46svh,460px)] grid-cols-1 gap-2 overflow-y-auto overscroll-contain touch-pan-y pr-1 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] scrollbar-thin sm:max-h-[min(54dvh,560px)] xl:max-h-[min(58dvh,640px)]';

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
  if (asset.type === 'audio') return '';

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

    if (asset.type === 'audio') {
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

  if (asset.type === 'audio') {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#160d05] text-[#c9b600]">
        <Music size={22} />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#7a6040]">Audio</span>
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

const TextAssetPreview = memo(function TextAssetPreview({ asset }: { asset: TextAsset }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg p-3 text-center"
      style={{ backgroundColor: asset.bgColor === '#00000000' ? '#160d05' : asset.bgColor }}
    >
      <span
        className="line-clamp-4 break-words font-semibold leading-tight"
        style={{
          color: asset.color,
          fontFamily: asset.fontFamily,
          fontSize: `${Math.max(10, Math.min(20, Math.round(asset.fontSize * 0.65)))}px`,
        }}
      >
        {asset.text.trim() || 'Text'}
      </span>
    </div>
  );
});

export default function LeftSidebar({
  layers,
  mediaAssets,
  textAssets,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onVideoUpload,
  onImageUpload,
  onAudioUpload,
  onPlaceAsset,
  onDeleteAsset,
  onPlaceTextAsset,
  onDeleteTextAsset,
  isUploadingMedia,
  uploadError,
}: LeftSidebarProps) {
  const [activeType, setActiveType] = useState<ObjectType>('video');
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const activeMeta = useMemo(() => OBJECT_TYPES.find((entry) => entry.type === activeType), [activeType]);
  const activeAssets = useMemo(
    () => mediaAssets.filter((asset) => asset.type === activeType),
    [activeType, mediaAssets]
  );
  const isMediaTab = activeType === 'video' || activeType === 'image' || activeType === 'audio';
  const isTextTab = activeType === 'text';
  const usedTextAssetIds = useMemo(() => {
    return new Set(
      layers
        .filter((layer) => layer.type === 'text' && layer.assetId)
        .map((layer) => layer.assetId as string)
    );
  }, [layers]);

  function handleFile(file: File | undefined, type: 'video' | 'image' | 'audio') {
    if (!file) return;
    if (type === 'video') onVideoUpload(file);
    else if (type === 'image') onImageUpload(file);
    else onAudioUpload(file);
  }

  function openActiveUpload() {
    if (activeType === 'video') videoInputRef.current?.click();
    else if (activeType === 'image') imageInputRef.current?.click();
    else if (activeType === 'audio') audioInputRef.current?.click();
  }

  function handleRecordedVideo(file: File) {
    setShowVideoRecorder(false);
    onVideoUpload(file);
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-b border-[#3d2510] bg-[#160d05] xl:border-b-0 xl:border-r">
        <div className="flex shrink-0 items-center gap-2 border-b border-[#3d2510] p-3 sm:p-4">
          <Layers size={13} className="text-[#c9b600]" />
          <h2 className="text-[#e8d5a0] text-xs font-bold uppercase tracking-wider">
            Layer Objects
          </h2>
        </div>

        <div className="shrink-0 border-b border-[#3d2510] p-3 sm:p-4">
          <LayerTypeMenu activeType={activeType} onChange={setActiveType} />
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain touch-pan-y p-3 [-webkit-overflow-scrolling:touch] scrollbar-thin sm:p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-[#7a6040] font-semibold uppercase tracking-wider">
              {activeMeta?.title}
            </h3>
            {activeType === 'video' ? (
              <span className="flex items-center gap-1 text-[10px] text-[#7a6040]">
                {isUploadingMedia ? <Loader2 size={11} className="animate-spin text-[#c9b600]" /> : null}
                Choose below
              </span>
            ) : isMediaTab ? (
              <button
                type="button"
                onClick={openActiveUpload}
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
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.currentTarget.files?.[0], 'audio');
              e.currentTarget.value = '';
            }}
          />
          {uploadError && (isMediaTab || isTextTab) ? (
            <p className="rounded border border-red-900/60 bg-red-950/30 p-2 text-[10px] text-red-200">{uploadError}</p>
          ) : null}
          {activeType === 'video' ? (
            <>
              <p className="rounded-lg border border-[#4a3010] bg-[#201206] p-2 text-[10px] leading-relaxed text-[#b79b64]">
                Max video length is 3 minutes ({MAX_TIMELINE_DURATION_SECONDS}s). Bigger videos are blocked before upload.
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setShowVideoRecorder(true)}
                  disabled={isUploadingMedia}
                  className="group flex min-h-24 items-center gap-3 rounded-xl border border-[#5a3b14] bg-[#241508] p-3 text-left transition hover:border-[#c9b600] hover:bg-[#2d1a08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#160d05] text-[#c9b600] shadow-inner shadow-black/40">
                    {isUploadingMedia ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
                  </span>
                  <span>
                    <span className="block text-[12px] font-bold text-[#e8d5a0]">Add Video</span>
                    <span className="mt-1 block text-[9px] leading-relaxed text-[#8b724c]">
                      Browse a saved clip or record a new video.
                    </span>
                  </span>
                </button>
              </div>
            </>
          ) : null}
          {activeType === 'audio' ? (
            <p className="rounded-lg border border-[#4a3010] bg-[#201206] p-2 text-[10px] leading-relaxed text-[#b79b64]">
              Max audio length is 3 minutes ({MAX_TIMELINE_DURATION_SECONDS}s). Bigger audio files are blocked before upload.
            </p>
          ) : null}
          {activeType === 'image' ? (
            <p className="rounded-lg border border-[#3d2510] bg-[#1d1006] p-2 text-[10px] leading-relaxed text-[#7a6040]">
              Project timeline max is 3 minutes ({MAX_TIMELINE_DURATION_SECONDS}s).
            </p>
          ) : null}

          {isMediaTab ? (
            activeAssets.length ? (
              <div className={SIDEBAR_LIST_CLASSNAME}>
                {activeAssets.map((asset) => {
                  const AssetIcon = asset.type === 'video' ? Film : asset.type === 'image' ? ImageIcon : Music;
                  return (
                    <div
                      key={asset.id}
                      className="relative flex min-w-0 items-start gap-3 rounded-xl border border-[#3d2510] bg-[#241508] p-2.5 text-left text-[#c8b88a] hover:border-[#c9b600] sm:p-3"
                      title={
                        asset.status === 'deployed'
                          ? asset.type === 'audio'
                            ? 'Add to timeline'
                            : 'Add to canvas and timeline'
                          : asset.status
                      }
                    >
                      <button
                        type="button"
                        disabled={asset.status !== 'deployed'}
                        onClick={() => onPlaceAsset(asset.id)}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left disabled:opacity-60 sm:gap-3"
                      >
                        <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[#3d2510] bg-[#160d05] sm:w-32">
                          <AssetPreview asset={asset} />
                          <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[#f3dd84]">
                            <AssetIcon size={11} />
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block line-clamp-2 text-[11px] font-semibold leading-tight">
                            {asset.originalFileName}
                          </span>
                          <span className="mt-1 block text-[9px] text-[#7a6040]">
                            {asset.status === 'deployed'
                              ? asset.type === 'video'
                                ? `${Math.round(asset.duration ?? 0)}s`
                                : asset.type === 'audio'
                                  ? `${Math.round(asset.duration ?? 0)}s audio`
                                  : 'Image asset'
                              : asset.status}
                          </span>
                          <span className="mt-2 inline-flex rounded bg-[#160d05] px-2 py-1 text-[9px] text-[#c9b600]">
                            Click to add
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAsset(asset.id)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/65 text-[#d7bfb0] transition-colors hover:text-red-300"
                        title="Delete media"
                        aria-label={`Delete ${asset.originalFileName}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              activeType === 'video' ? (
                <p className="rounded-lg border border-dashed border-[#3d2510] bg-[#1d1006] p-3 text-center text-xs leading-relaxed text-[#7a6040]">
                  Browse a saved video or record a new one to add your first clip.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={openActiveUpload}
                  className="w-full rounded-lg border border-dashed border-[#3d2510] bg-[#241508] p-3 text-sm text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600]"
                >
                  Upload your first {activeType}
                </button>
              )
            )
          ) : textAssets.length ? (
            <div className={SIDEBAR_LIST_CLASSNAME}>
              {textAssets.map((asset) => {
                const usedInTimeline = usedTextAssetIds.has(asset.id);
                return (
                  <div
                    key={asset.id}
                    className="relative flex min-w-0 items-start gap-3 rounded-xl border border-[#3d2510] bg-[#241508] p-2.5 text-left text-[#c8b88a] hover:border-[#c9b600] sm:p-3"
                    title="Add text to timeline"
                  >
                    <button
                      type="button"
                      onClick={() => onPlaceTextAsset(asset.id)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left sm:gap-3"
                    >
                      <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[#3d2510] bg-[#160d05] sm:w-32">
                        <TextAssetPreview asset={asset} />
                        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-[#f3dd84]">
                          <TypeIcon size={11} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block line-clamp-2 text-[11px] font-semibold leading-tight">
                          {asset.name}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-[9px] text-[#7a6040]">
                          {asset.text || 'Text template'}
                        </span>
                        <span className="mt-2 inline-flex rounded bg-[#160d05] px-2 py-1 text-[9px] text-[#c9b600]">
                          Click to add
                        </span>
                        {usedInTimeline ? (
                          <span className="ml-1 mt-2 inline-flex rounded bg-[#2d1a08] px-2 py-1 text-[9px] text-[#d8c35d]">
                            In timeline
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTextAsset(asset.id)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/65 text-[#d7bfb0] transition-colors hover:text-red-300"
                      title={usedInTimeline ? 'Remove from timeline first' : 'Delete text'}
                      aria-label={`Delete ${asset.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => onAddLayer(activeType as LayerType)}
                className="flex min-h-20 w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#3d2510] bg-[#241508] text-[10px] text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600]"
              >
                + Add text template
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddLayer(activeType as LayerType)}
              className="w-full rounded-lg border border-dashed border-[#3d2510] bg-[#241508] text-[#7a6040] hover:border-[#5a4530] hover:text-[#c9b600] p-3 text-sm flex items-center justify-center gap-2"
            >
              + Add text template
            </button>
          )}
        </div>
        <BrowserVideoRecorder
          isOpen={showVideoRecorder}
          title="Add Video"
          onClose={() => setShowVideoRecorder(false)}
          onBrowse={onVideoUpload}
          onCapture={handleRecordedVideo}
          maxDurationSeconds={MAX_TIMELINE_DURATION_SECONDS}
        />
      </aside>
  );
}
