import { SubtitleChunk } from '@/types/editor';
import { hasWebGPU, makeAudioChunks, normalizeWhisperOutput, sleep } from './worker-utils';

type Language = 'auto' | 'ur' | 'en';
type WorkerCommand =
  | {
      type: 'start';
      id: string;
      audio: Float32Array;
      sampleRate: 16000;
      modelName: string;
      language: Language;
      dtype: string;
      preferWebGPU: boolean;
    }
  | { type: 'pause'; id: string }
  | { type: 'resume'; id: string }
  | { type: 'cancel'; id: string };

type WorkerStatus =
  | 'audio-ready'
  | 'model-loading'
  | 'model-ready'
  | 'chunk-start'
  | 'chunk-complete'
  | 'paused'
  | 'resumed'
  | 'complete'
  | 'error';

type WorkerResponse =
  | { type: 'status'; id: string; status: WorkerStatus; message: string; progress?: number }
  | { type: 'chunk'; id: string; chunkIndex: number; chunks: SubtitleChunk[]; progress: number }
  | { type: 'complete'; id: string }
  | { type: 'error'; id: string; message: string };

const ctx = self as unknown as {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerCommand>) => void) | null;
};
let activeId: string | null = null;
let paused = false;
let cancelled = false;
let cachedTranscriber: any = null;
let cachedKey = '';

function post(message: WorkerResponse) {
  ctx.postMessage(message);
}

async function waitIfPaused(id: string) {
  while (paused && !cancelled && activeId === id) {
    post({ type: 'status', id, status: 'paused', message: 'Transcription paused.' });
    await sleep(250);
  }
}

async function getTranscriber(
  id: string,
  modelName: string,
  dtype: string,
  preferWebGPU: boolean
) {
  const device = preferWebGPU && hasWebGPU() ? 'webgpu' : 'wasm';
  const key = `${modelName}:${dtype}:${device}`;
  if (cachedTranscriber && cachedKey === key) return cachedTranscriber;

  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = false;

  post({
    type: 'status',
    id,
    status: 'model-loading',
    message: `Loading ${modelName} on ${device.toUpperCase()}...`,
    progress: 0,
  });

  try {
    cachedTranscriber = await pipeline('automatic-speech-recognition', modelName, {
      dtype,
      device,
      progress_callback: (info: any) => {
        if (info?.status === 'progress' && typeof info.progress === 'number') {
          post({
            type: 'status',
            id,
            status: 'model-loading',
            message: `Loading model: ${Math.round(info.progress)}%`,
            progress: Math.max(0, Math.min(1, info.progress / 100)),
          });
        }
      },
    } as any);
    cachedKey = key;
    return cachedTranscriber;
  } catch (error) {
    if (device !== 'webgpu') throw error;
    post({
      type: 'status',
      id,
      status: 'model-loading',
      message: 'WebGPU failed. Falling back to WASM...',
      progress: 0,
    });
    cachedTranscriber = await pipeline('automatic-speech-recognition', modelName, {
      dtype,
      device: 'wasm',
    } as any);
    cachedKey = `${modelName}:${dtype}:wasm`;
    return cachedTranscriber;
  }
}

async function runTranscription(command: Extract<WorkerCommand, { type: 'start' }>) {
  const { id, audio, sampleRate, modelName, language, dtype, preferWebGPU } = command;
  activeId = id;
  paused = false;
  cancelled = false;

  post({ type: 'status', id, status: 'audio-ready', message: 'Audio ready for transcription.', progress: 0 });
  const transcriber = await getTranscriber(id, modelName, dtype, preferWebGPU);
  post({ type: 'status', id, status: 'model-ready', message: 'Model ready. Transcribing...', progress: 0 });

  const chunks = makeAudioChunks(audio, sampleRate);
  for (let i = 0; i < chunks.length; i += 1) {
    if (cancelled || activeId !== id) return;
    await waitIfPaused(id);
    if (cancelled || activeId !== id) return;

    const chunk = chunks[i];
    post({
      type: 'status',
      id,
      status: 'chunk-start',
      message: `Transcribing chunk ${i + 1} of ${chunks.length}...`,
      progress: i / Math.max(1, chunks.length),
    });

    const result = await transcriber(chunk.audio, {
      return_timestamps: true,
      language: language === 'auto' ? undefined : language,
      task: 'transcribe',
      generate_kwargs: {
        language: language === 'auto' ? undefined : language,
        task: 'transcribe',
      },
    } as any);

    const subtitleChunks = normalizeWhisperOutput(result, i, chunk.startTime, chunk.endTime);
    post({
      type: 'chunk',
      id,
      chunkIndex: i,
      chunks: subtitleChunks,
      progress: (i + 1) / Math.max(1, chunks.length),
    });
    post({
      type: 'status',
      id,
      status: 'chunk-complete',
      message: `Finished chunk ${i + 1} of ${chunks.length}.`,
      progress: (i + 1) / Math.max(1, chunks.length),
    });
  }

  post({ type: 'status', id, status: 'complete', message: 'Transcription complete.', progress: 1 });
  post({ type: 'complete', id });
}

ctx.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;
  if (command.type === 'pause' && command.id === activeId) {
    paused = true;
    return;
  }
  if (command.type === 'resume' && command.id === activeId) {
    paused = false;
    post({ type: 'status', id: command.id, status: 'resumed', message: 'Transcription resumed.' });
    return;
  }
  if (command.type === 'cancel' && command.id === activeId) {
    cancelled = true;
    paused = false;
    activeId = null;
    return;
  }
  if (command.type !== 'start') return;

  runTranscription(command).catch((error) => {
    const message = error instanceof Error ? error.message : 'Transcription failed.';
    post({ type: 'error', id: command.id, message });
  });
};

export {};
