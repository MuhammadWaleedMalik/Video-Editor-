import { Layer } from '@/types/editor';

export type MediaKind = 'video' | 'audio' | 'image';
export type UploadedMediaResponse = {
  id: string;
  url: string;
  type: 'video' | 'image';
  originalFileName: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  status: 'deployed';
};

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

    media.onloadedmetadata = () => {
      const length = media.duration;
      resolve(Number.isFinite(length) && length > 0 ? length : null);
    };
    media.onerror = () => {
      resolve(null);
    };
    media.onabort = () => {
      resolve(null);
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

    const cleanup = () => {
      media.removeAttribute('src');
      media.load();
    };

    media.onloadedmetadata = () => {
      const duration = media.duration;
      const width = media.videoWidth;
      const height = media.videoHeight;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0 || width <= 0 || height <= 0) {
        resolve(null);
        return;
      }
      resolve({ width, height, duration });
    };
    media.onerror = () => {
      cleanup();
      resolve(null);
    };
    media.onabort = () => {
      cleanup();
      resolve(null);
    };
  });
}

export function loadImageMetadata(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        resolve(null);
        return;
      }
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function uploadMediaFile(file: File): Promise<UploadedMediaResponse> {
  if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
    throw new Error('Unsupported file type. Choose a video or image file.');
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
