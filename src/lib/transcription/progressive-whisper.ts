import { SubtitleChunk } from '@/types/editor';
import { extractAudioFromFile } from './audio';

export type TranscriptionLanguage = 'auto' | 'ur' | 'en';

export interface TranscriptionProgress {
  stage: 'audio' | 'model' | 'chunk' | 'complete' | 'error' | 'paused' | 'resumed';
  message: string;
  progress?: number;
}

export interface ProgressiveWhisperOptions {
  modelName?: string;
  language?: TranscriptionLanguage;
  dtype?: 'q8' | 'fp32' | 'fp16' | string;
  preferWebGPU?: boolean;
  onProgress?: (event: TranscriptionProgress) => void;
  onChunk?: (chunks: SubtitleChunk[], chunkIndex: number) => void;
  onSubtitles?: (chunks: SubtitleChunk[]) => void;
  onComplete?: (chunks: SubtitleChunk[]) => void;
  onError?: (error: Error) => void;
}

export interface ProgressiveWhisperController {
  id: string;
  promise: Promise<SubtitleChunk[]>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

type WorkerMessage =
  | { type: 'status'; id: string; status: string; message: string; progress?: number }
  | { type: 'chunk'; id: string; chunkIndex: number; chunks: SubtitleChunk[]; progress: number }
  | { type: 'complete'; id: string }
  | { type: 'error'; id: string; message: string };

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `whisper-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeProgress(message: WorkerMessage): TranscriptionProgress {
  if (message.type !== 'status') {
    return { stage: 'chunk', message: 'Transcribing chunk...', progress: 0 };
  }
  if (message.status === 'model-loading' || message.status === 'model-ready') {
    return { stage: 'model', message: message.message, progress: message.progress };
  }
  if (message.status === 'chunk-start' || message.status === 'chunk-complete') {
    return { stage: 'chunk', message: message.message, progress: message.progress };
  }
  if (message.status === 'complete') {
    return { stage: 'complete', message: message.message, progress: 1 };
  }
  if (message.status === 'paused') return { stage: 'paused', message: message.message };
  if (message.status === 'resumed') return { stage: 'resumed', message: message.message };
  return { stage: 'audio', message: message.message, progress: message.progress };
}

function mergeSubtitleChunks(existing: SubtitleChunk[], incoming: SubtitleChunk[]) {
  const byKey = new Map<string, SubtitleChunk>();
  [...existing, ...incoming].forEach((chunk) => {
    const key = `${chunk.startTime.toFixed(1)}:${chunk.endTime.toFixed(1)}:${chunk.text.toLowerCase()}`;
    byKey.set(key, chunk);
  });
  return Array.from(byKey.values()).sort((a, b) => a.startTime - b.startTime);
}

export function createProgressiveWhisperFromFile(
  file: File,
  options: ProgressiveWhisperOptions = {}
): ProgressiveWhisperController {
  const id = makeId();
  const worker = new Worker(new URL('./transcription.worker.ts', import.meta.url), {
    type: 'module',
  });
  let cancelled = false;
  let subtitles: SubtitleChunk[] = [];

  const promise = new Promise<SubtitleChunk[]>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.id !== id) return;

      if (message.type === 'status') {
        options.onProgress?.(normalizeProgress(message));
        return;
      }

      if (message.type === 'chunk') {
        subtitles = mergeSubtitleChunks(subtitles, message.chunks);
        options.onChunk?.(message.chunks, message.chunkIndex);
        options.onSubtitles?.(subtitles);
        options.onProgress?.({
          stage: 'chunk',
          message: `Transcribed chunk ${message.chunkIndex + 1}.`,
          progress: message.progress,
        });
        return;
      }

      if (message.type === 'complete') {
        options.onProgress?.({ stage: 'complete', message: 'Transcription complete.', progress: 1 });
        options.onComplete?.(subtitles);
        worker.terminate();
        resolve(subtitles);
        return;
      }

      const error = new Error(message.message);
      options.onProgress?.({ stage: 'error', message: message.message });
      options.onError?.(error);
      worker.terminate();
      reject(error);
    };

    worker.onerror = (event) => {
      const error = new Error(event.message || 'Transcription worker failed.');
      options.onError?.(error);
      worker.terminate();
      reject(error);
    };

    extractAudioFromFile(file, {
      onProgress: (progress, message) => options.onProgress?.({ stage: 'audio', message, progress }),
    })
      .then(({ audio, sampleRate }) => {
        if (cancelled) {
          worker.terminate();
          reject(new Error('Transcription cancelled.'));
          return;
        }
        worker.postMessage(
          {
            type: 'start',
            id,
            audio,
            sampleRate,
            modelName: options.modelName ?? 'onnx-community/whisper-base',
            language: options.language ?? 'auto',
            dtype: options.dtype ?? 'q8',
            preferWebGPU: options.preferWebGPU ?? true,
          },
          [audio.buffer]
        );
      })
      .catch((error) => {
        const normalized = error instanceof Error ? error : new Error('Audio extraction failed.');
        options.onProgress?.({ stage: 'error', message: normalized.message });
        options.onError?.(normalized);
        worker.terminate();
        reject(normalized);
      });
  });

  return {
    id,
    promise,
    pause: () => worker.postMessage({ type: 'pause', id }),
    resume: () => worker.postMessage({ type: 'resume', id }),
    cancel: () => {
      cancelled = true;
      worker.postMessage({ type: 'cancel', id });
      worker.terminate();
    },
  };
}
