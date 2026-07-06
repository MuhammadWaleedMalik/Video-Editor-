import { SubtitleChunk } from '@/types/editor';
import { extractAudioFromFile } from '@/src/lib/transcription';

export async function extractAudioTrack(file: File): Promise<Float32Array> {
  const { audio } = await extractAudioFromFile(file);
  return audio;
}

export async function transcribeAudio(): Promise<SubtitleChunk[]> {
  throw new Error('Use createProgressiveWhisperFromFile() for worker-based transcription.');
}

