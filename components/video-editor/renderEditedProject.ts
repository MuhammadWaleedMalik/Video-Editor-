import { CanvasObject, EditorState, Layer, MediaAsset, TimelineClip, VideoFormat } from '@/types/editor';
import { wrapText } from './videoCanvas';
import { getTimelineStackItems, isClipActive, shouldRenderAsset, sourceTimeForClip } from './timelineModel';

interface RenderEditedProjectOptions {
  fileName?: string;
  fps?: number;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
  requireAudio?: boolean;
  progressLabel?: string;
}

interface VideoEntry {
  clip: TimelineClip;
  asset: MediaAsset;
  video: HTMLVideoElement;
  gain?: GainNode;
}

interface LayerVideoEntry {
  layer: Layer;
  video: HTMLVideoElement;
}

const DEFAULT_FPS = 24;

function getOutputSize(format: VideoFormat) {
  if (format === '9:16') return { width: 720, height: 1280 };
  if (format === '1:1') return { width: 1080, height: 1080 };
  return { width: 1280, height: 720 };
}

function getRecorderMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? '';
}

function waitForMediaEvent<T extends HTMLMediaElement>(
  media: T,
  eventName: keyof HTMLMediaElementEventMap
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      media.removeEventListener(eventName, onEvent);
      media.removeEventListener('error', onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Could not prepare project media for transcription.'));
    };
    media.addEventListener(eventName, onEvent, { once: true });
    media.addEventListener('error', onError, { once: true });
  });
}

function makeVideo(url: string) {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.preload = 'auto';
  video.src = url;
  return video;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load project image for transcription render.'));
    img.src = url;
  });
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
  return null;
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  object: Pick<CanvasObject, 'x' | 'y' | 'width' | 'height' | 'opacity' | 'rotation' | 'scaleX' | 'scaleY'>,
  source: CanvasImageSource | null
) {
  const rect = rectForObject(object, ctx.canvas);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, object.opacity));
  ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.rotate(((object.rotation || 0) * Math.PI) / 180);
  ctx.scale(object.scaleX || 1, object.scaleY || 1);

  if (!source) {
    ctx.fillStyle = '#050301';
    ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
    ctx.restore();
    return;
  }

  const sourceSize = getSourceDimensions(source);
  if (sourceSize?.width && sourceSize?.height) {
    const fitScale = Math.min(rect.width / sourceSize.width, rect.height / sourceSize.height);
    const drawWidth = Math.max(1, sourceSize.width * fitScale);
    const drawHeight = Math.max(1, sourceSize.height * fitScale);
    ctx.drawImage(source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  } else {
    ctx.drawImage(source, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
  }
  ctx.restore();
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: Layer) {
  const rect = rectForObject(layer, ctx.canvas);
  ctx.save();
  ctx.fillStyle = layer.bgColor || '#00000000';
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  const fontSize = Math.max(8, (layer.fontSize || 20) * (ctx.canvas.width / 960));
  ctx.font = `700 ${fontSize}px ${layer.fontFamily || 'Inter, Arial, sans-serif'}`;
  ctx.fillStyle = layer.color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(ctx, layer.text || '', Math.max(20, rect.width - 12));
  const lineHeight = fontSize * 1.25;
  const top = rect.y + rect.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, rect.x + rect.width / 2, top + index * lineHeight);
  });
  ctx.restore();
}

function mapAssetsById(assets: MediaAsset[]) {
  return new Map(assets.map((asset) => [asset.id, asset]));
}

async function prepareVideoEntries(state: EditorState, assetById: Map<string, MediaAsset>) {
  const entries: VideoEntry[] = [];
  for (const clip of state.timelineClips) {
    const asset = assetById.get(clip.assetId);
    if (asset?.type !== 'video' || asset.status !== 'deployed') continue;
    const video = makeVideo(asset.url);
    entries.push({ clip, asset, video });
  }
  await Promise.all(entries.map((entry) => waitForMediaEvent(entry.video, 'loadedmetadata').catch(() => undefined)));
  return entries;
}

async function prepareLayerVideoEntries(layers: Layer[]) {
  const entries = layers
    .filter((layer) => layer.type === 'video' && Boolean(layer.src))
    .map((layer) => ({ layer, video: makeVideo(layer.src!) }));
  await Promise.all(entries.map((entry) => waitForMediaEvent(entry.video, 'loadedmetadata').catch(() => undefined)));
  return entries;
}

async function playVideo(video: HTMLVideoElement) {
  try {
    await video.play();
  } catch {
    // If the browser blocks media playback, the recorder still captures any already-decoded frames.
  }
}

function stopVideo(video: HTMLVideoElement) {
  video.pause();
  video.removeAttribute('src');
  video.load();
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error('Transcription cancelled.');
  }
}

export async function renderEditedProjectForTranscription(
  state: EditorState,
  options: RenderEditedProjectOptions = {}
) {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error('Your browser cannot record the edited project for transcription.');
  }
  throwIfAborted(options.signal);

  const duration = Math.max(0, state.duration);
  if (duration <= 0 || !state.timelineClips.length) {
    throw new Error('Add a video to the main timeline before auto transcribing.');
  }

  const assetById = mapAssetsById(state.mediaAssets);
  const audioClips = state.timelineClips.filter((clip) => {
    const asset = assetById.get(clip.assetId);
    return asset?.type === 'video' && asset.status === 'deployed' && !clip.muted;
  });
  if (options.requireAudio !== false && !audioClips.length) {
    throw new Error('The edited timeline has no unmuted main-video audio to transcribe.');
  }

  const canvas = document.createElement('canvas');
  const outputSize = getOutputSize(state.format);
  canvas.width = outputSize.width;
  canvas.height = outputSize.height;
  const ctx = canvas.getContext('2d');
  const captureStream = canvas.captureStream?.bind(canvas);
  if (!ctx || !captureStream) {
    throw new Error('Your browser cannot capture the edited canvas for transcription.');
  }
  const renderCtx = ctx;

  const fps = options.fps ?? DEFAULT_FPS;
  const canvasStream = captureStream(fps);
  const AudioContextCtor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error('Your browser cannot mix edited video audio for transcription.');
  }
  const audioContext = new AudioContextCtor();
  const audioDestination = audioContext.createMediaStreamDestination();
  const imageCache = new Map<string, HTMLImageElement>();
  let entries: VideoEntry[] = [];
  let layerVideoEntries: LayerVideoEntry[] = [];

  try {
    options.onProgress?.('Preparing edited canvas...');
    entries = await prepareVideoEntries(state, assetById);
    throwIfAborted(options.signal);
    layerVideoEntries = await prepareLayerVideoEntries(state.layers);
    throwIfAborted(options.signal);

    await Promise.all(
      state.mediaAssets
        .filter((asset) => asset.type === 'image' && asset.status === 'deployed')
        .map(async (asset) => {
          imageCache.set(asset.id, await loadImage(asset.url));
        })
    );
    throwIfAborted(options.signal);

    await Promise.all(
      state.layers
        .filter((layer) => layer.type === 'image' && Boolean(layer.src))
        .map(async (layer) => {
          imageCache.set(layer.id, await loadImage(layer.src!));
        })
    );
    throwIfAborted(options.signal);

    entries.forEach((entry) => {
      if (entry.clip.muted) return;
      const source = audioContext.createMediaElementSource(entry.video);
      const gain = audioContext.createGain();
      gain.gain.value = Math.max(0, Math.min(1, entry.clip.volume));
      source.connect(gain);
      gain.connect(audioDestination);
      entry.gain = gain;
    });

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const mixedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);
    const mimeType = getRecorderMimeType();
    const recorder = new MediaRecorder(mixedStream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    const recorded = new Promise<File>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => reject(new Error('Could not record the edited project for transcription.'));
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
        resolve(new File([blob], options.fileName ?? 'edited-project-transcription.webm', { type: blob.type }));
      };
    });

    const findEntry = (clip: TimelineClip) => {
      return entries.find((entry) => entry.clip.id === clip.id);
    };

    const findLayerVideo = (layer: Layer) => {
      return layerVideoEntries.find((entry) => entry.layer.id === layer.id);
    };

    const syncVideo = (entry: VideoEntry, time: number) => {
      if (!isClipActive(entry.clip, time)) {
        entry.video.pause();
        return;
      }
      const desired = sourceTimeForClip(entry.clip, time);
      if (Number.isFinite(desired) && Math.abs(entry.video.currentTime - desired) > 0.2) {
        try {
          entry.video.currentTime = Math.max(0, Math.min(desired, entry.asset.duration ?? desired));
        } catch {
          // Browser decoders can reject an early seek; the render loop retries.
        }
      }
      if (entry.video.paused) void playVideo(entry.video);
    };

    const syncLayerVideo = (entry: LayerVideoEntry, time: number) => {
      const layer = entry.layer;
      if (time < layer.startTime || time > layer.endTime) {
        entry.video.pause();
        return;
      }
      const desired = Math.max(0, time - layer.startTime);
      if (Math.abs(entry.video.currentTime - desired) > 0.2) {
        try {
          entry.video.currentTime = desired;
        } catch {
          // The next render frame retries once metadata is ready.
        }
      }
      if (entry.video.paused) void playVideo(entry.video);
    };

    const drawFrame = (time: number) => {
      renderCtx.fillStyle = '#050301';
      renderCtx.fillRect(0, 0, canvas.width, canvas.height);

      entries.forEach((entry) => syncVideo(entry, time));
      layerVideoEntries.forEach((entry) => syncLayerVideo(entry, time));

      const activeClips = state.timelineClips.filter(
        (clip) => isClipActive(clip, time) && shouldRenderAsset(assetById.get(clip.assetId))
      );
      const activeLayers = state.layers.filter(
        (layer) => layer.type !== 'audio' && time >= layer.startTime && time <= layer.endTime
      );
      const renderItems = getTimelineStackItems(activeLayers, activeClips, state.canvasObjects).reverse();

      renderItems.forEach((item) => {
        if (item.kind === 'clip') {
          const asset = assetById.get(item.clip.assetId);
          if (!asset) return;
          if (asset.type === 'image') {
            drawObject(renderCtx, item.object, imageCache.get(asset.id) ?? null);
            return;
          }
          const entry = findEntry(item.clip);
          const source = entry && entry.video.readyState >= 2 ? entry.video : null;
          drawObject(renderCtx, item.object, source);
          return;
        }

        const layer = item.layer;
        if (layer.type === 'text') {
          drawTextLayer(renderCtx, layer);
          return;
        }
        if (layer.type === 'image' && layer.src) {
          const image = imageCache.get(layer.id) ?? null;
          drawObject(renderCtx, { ...layer, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 }, image);
          return;
        }
        if (layer.type === 'video' && layer.src) {
          const entry = findLayerVideo(layer);
          const source = entry && entry.video.readyState >= 2 ? entry.video : null;
          drawObject(renderCtx, { ...layer, opacity: 1, rotation: 0, scaleX: 1, scaleY: 1 }, source);
        }
      });
    };

    drawFrame(0);
    recorder.start(1000);
    const startedAt = performance.now();
    let lastProgress = -1;

    await new Promise<void>((resolve, reject) => {
      const step = () => {
        if (options.signal?.aborted) {
          if (recorder.state !== 'inactive') recorder.stop();
          reject(new Error('Transcription cancelled.'));
          return;
        }
        const elapsed = Math.min(duration, (performance.now() - startedAt) / 1000);
        drawFrame(elapsed);
        const progress = Math.floor((elapsed / duration) * 100);
        if (progress !== lastProgress && progress % 5 === 0) {
          lastProgress = progress;
          options.onProgress?.(`${options.progressLabel ?? 'Rendering edited canvas audio'}... ${progress}%`);
        }
        if (elapsed >= duration) {
          window.setTimeout(resolve, 120);
          return;
        }
        window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    });

    entries.forEach((entry) => entry.video.pause());
    layerVideoEntries.forEach((entry) => entry.video.pause());
    recorder.stop();
    return await recorded;
  } finally {
    canvasStream.getTracks().forEach((track) => track.stop());
    entries.forEach((entry) => stopVideo(entry.video));
    layerVideoEntries.forEach((entry) => stopVideo(entry.video));
    await audioContext.close().catch(() => undefined);
  }
}
