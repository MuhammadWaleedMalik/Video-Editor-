import { EditorState, Layer, LayerType, TextAsset } from '@/types/editor';

export const TRANSCRIBE_MODEL = 'onnx-community/whisper-base';

export const DEFAULT_TEXT_ASSET_ID = 'default-text-template';

export const DEFAULT_TEXT_ASSET: TextAsset = {
  id: DEFAULT_TEXT_ASSET_ID,
  type: 'text',
  name: 'Text 1',
  text: 'Double click to edit text',
  fontSize: 20,
  fontFamily: 'Inter, Arial, sans-serif',
  themeId: 'inter-clean',
  color: '#ffffff',
  bgColor: '#00000000',
  createdAt: 0,
};

export const initialState: EditorState = {
  videoFile: null,
  videoUrl: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  trimStart: 0,
  trimEnd: 0,
  subtitles: [],
  hasAudio: false,
  audioMuted: false,
  format: '16:9',
  playbackRate: 1,
  subtitleFontScale: 100,
  subtitleFontFamily: 'Inter, Arial, sans-serif',
  layers: [],
  selectedLayerId: null,
  mediaAssets: [],
  textAssets: [],
  timelineClips: [],
  canvasObjects: [],
  selectedClipId: null,
  selectedCanvasObjectId: null,
  uploadError: null,
  isUploadingMedia: false,
};

export async function extractWaveform(url: string): Promise<Float32Array | null> {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const ctx = new AudioContext();
    const audio = await ctx.decodeAudioData(buf);
    const channel = audio.getChannelData(0);
    const samples = 800;
    const block = Math.floor(channel.length / samples);
    const waveform = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const start = i * block;
      let max = 0;
      for (let j = 0; j < block; j++) {
        const abs = Math.abs(channel[start + j] ?? 0);
        if (abs > max) max = abs;
      }
      waveform[i] = max;
    }
    await ctx.close();
    return waveform;
  } catch {
    return null;
  }
}

export function createDefaultLayer(type: LayerType, count: number, x = 30, y = 30): Layer {
  const id = crypto.randomUUID();
  const base: Layer = {
    id,
    type,
    x,
    y,
    width: type === 'text' ? 40 : type === 'image' ? 35 : type === 'video' ? 40 : 18,
    height: type === 'text' ? 12 : type === 'image' ? 35 : type === 'video' ? 40 : 18,
    zIndex: count + 1,
    name: `${type === 'audio' ? 'Audio' : `${type[0].toUpperCase()}${type.slice(1)}`} ${count + 1}`,
    startTime: 0,
    endTime: 5,
    src: '',
  };

  if (type === 'text') {
    return {
      ...base,
      text: 'Double click to edit text',
      fontSize: 20,
      fontFamily: 'Inter, Arial, sans-serif',
      themeId: 'inter-clean',
      color: '#ffffff',
      bgColor: '#00000000',
    };
  }
  if (type === 'video') return { ...base, mediaMuted: true };
  return base;
}

export function createDefaultTextAsset(count: number): TextAsset {
  const number = count + 1;
  return {
    ...DEFAULT_TEXT_ASSET,
    id: crypto.randomUUID(),
    name: `Text ${number}`,
    createdAt: Date.now(),
  };
}

export function createLayerFromTextAsset(asset: TextAsset, count: number, x = 30, y = 30): Layer {
  return {
    ...createDefaultLayer('text', count, x, y),
    assetId: asset.id,
    name: asset.name,
    text: asset.text,
    fontSize: asset.fontSize,
    fontFamily: asset.fontFamily,
    themeId: asset.themeId,
    color: asset.color,
    bgColor: asset.bgColor,
  };
}
