import { Layer } from '@/types/editor';

export type MediaKind = 'video' | 'audio' | 'image';

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
