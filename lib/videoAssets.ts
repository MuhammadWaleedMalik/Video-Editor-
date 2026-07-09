import { Layer } from '@/types/editor';

export type MediaKind = 'video' | 'audio' | 'image';
export type UploadedMediaResponse = {
  id: string;
  url: string;
  type: 'video' | 'image' | 'audio';
  originalFileName: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  status: 'deployed';
};

const MEDIA_METADATA_TIMEOUT_MS = 12000;

export function createBlobUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeBlobUrl(url?: string | null): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function getMediaDuration(url: string, kind: MediaKind): Promise<number | null> {
  return new Promise((resolve) => {
    const media = kind === 'video' ? document.createElement('video') : document.createElement('audio');
    if (kind === 'video') {
      (media as HTMLVideoElement).playsInline = true;
      media.setAttribute('playsinline', 'true');
      media.setAttribute('webkit-playsinline', 'true');
    }
    media.preload = 'metadata';
    media.src = url;

    let settled = false;
    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      media.removeAttribute('src');
      media.load();
      resolve(duration);
    };
    const timeout = window.setTimeout(() => finish(null), MEDIA_METADATA_TIMEOUT_MS);

    media.onloadedmetadata = () => {
      const length = media.duration;
      finish(Number.isFinite(length) && length > 0 ? length : null);
    };
    media.onerror = () => {
      finish(null);
    };
    media.onabort = () => {
      finish(null);
    };
  });
}

export function loadVideoMetadata(url: string): Promise<{ width: number; height: number; duration: number } | null> {
  return new Promise((resolve) => {
    const media = document.createElement('video');
    media.preload = 'metadata';
    media.crossOrigin = 'anonymous';
    media.playsInline = true;
    media.setAttribute('playsinline', 'true');
    media.setAttribute('webkit-playsinline', 'true');
    media.src = url;

    let settled = false;
    const cleanup = () => {
      media.removeAttribute('src');
      media.load();
    };
    const finish = (metadata: { width: number; height: number; duration: number } | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      cleanup();
      resolve(metadata);
    };
    const timeout = window.setTimeout(() => finish(null), MEDIA_METADATA_TIMEOUT_MS);

    media.onloadedmetadata = () => {
      const duration = media.duration;
      const width = media.videoWidth;
      const height = media.videoHeight;
      if (!Number.isFinite(duration) || duration <= 0 || width <= 0 || height <= 0) {
        finish(null);
        return;
      }
      finish({ width, height, duration });
    };
    media.onerror = () => {
      finish(null);
    };
    media.onabort = () => {
      finish(null);
    };
  });
}

export function loadImageMetadata(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let settled = false;
    const finish = (metadata: { width: number; height: number } | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(metadata);
    };
    const timeout = window.setTimeout(() => finish(null), MEDIA_METADATA_TIMEOUT_MS);
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        finish(null);
        return;
      }
      finish({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => finish(null);
    img.src = url;
  });
}

export async function uploadMediaFile(file: File): Promise<UploadedMediaResponse> {
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/') && !file.type.startsWith('audio/')) {
    throw new Error('Unsupported file type. Choose a video, image, or audio file.');
  }

  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/upload', {
    method: 'POST',
    body,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || 'Upload failed.');
  }
  return payload as UploadedMediaResponse;
}

export async function buildLayerFromFile(
  layer: Layer,
  file: File,
  projectDuration = 0
): Promise<Layer> {
  const src = createBlobUrl(file);
  const nextLayer: Layer = {
    ...layer,
    src,
  };

  if (layer.src) revokeBlobUrl(layer.src);

  if (layer.type === 'video' || layer.type === 'audio') {
    const mediaDuration = await getMediaDuration(src, layer.type);
    if (mediaDuration) {
      const expandedEnd = nextLayer.startTime + mediaDuration;
      nextLayer.endTime = projectDuration > 0 ? Math.min(projectDuration, expandedEnd) : expandedEnd;
    }
  }

  return nextLayer;
}
