import { SubtitleChunk } from '@/types/editor';

/**
 * Extracts and decodes the audio channel from a media File (video or audio)
 * and resamples it to 16000Hz mono Float32Array (required by Whisper).
 */
export async function extractAudioTrack(file: File): Promise<Float32Array> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  // Whisper model requires exactly 16000 Hz sample rate
  const audioCtx = new AudioContextClass({ sampleRate: 16000 });
  const arrayBuffer = await file.arrayBuffer();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err: any) {
    throw new Error(`Failed to decode audio track from file: ${err.message || 'Unknown decoding error'}`);
  } finally {
    await audioCtx.close();
  }

  // Extract mono channel data
  if (audioBuffer.numberOfChannels === 0) {
    throw new Error('No audio channels found in the uploaded media file.');
  }

  return audioBuffer.getChannelData(0);
}

/**
 * Transcribes the audio data using Hugging Face Transformers Whisper pipeline.
 * Fixed for proper multilingual / Urdu transcription.
 */
export async function transcribeAudio(
  audioData: Float32Array,
  modelName: string = 'Xenova/whisper-small',
  onProgress?: (status: string) => void,
  language: string = 'auto'                     // 'urdu', 'hi', 'auto', etc.
): Promise<SubtitleChunk[]> {

  const { pipeline, env } = await import('@huggingface/transformers');

  env.allowLocalModels = false;

  if (onProgress) onProgress(`Loading Whisper model (${modelName})...`);

  const transcriber = await pipeline(
    'automatic-speech-recognition',
    modelName,
    {
      dtype: 'fp32',
      progress_callback: (info: any) => {
        if (onProgress && info.status === 'progress' && typeof info.progress === 'number') {
          onProgress(`Loading model weights: ${Math.round(info.progress)}%`);
        } else if (onProgress && info.status === 'ready') {
          onProgress('Model loaded. Starting transcription...');
        }
      }
    } as any
  );

  if (onProgress) onProgress('Transcribing audio...');

  // Optional explicit language (e.g. 'en', 'ur') or auto-detect with 'auto'
  const output = await transcriber(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
    language: language === 'auto' ? undefined : language,
    task: 'transcribe',
    generate_kwargs: {
      language: language === 'auto' ? undefined : language,
      task: 'transcribe'
    }
  });

  if (!output || !output.chunks) {
    throw new Error('No transcription segments returned from the model.');
  }

  // Convert chunks to SubtitleChunk format
  return output.chunks.map((chunk: any, index: number) => {
    let start = 0;
    let end = 0;

    if (chunk.timestamp && Array.isArray(chunk.timestamp)) {
      start = typeof chunk.timestamp[0] === 'number' ? chunk.timestamp[0] : 0;
      end = typeof chunk.timestamp[1] === 'number' ? chunk.timestamp[1] : start + 4;
    }

    return {
      id: `transcribed-${index + 1}`,
      startTime: parseFloat(start.toFixed(2)),
      endTime: parseFloat(end.toFixed(2)),
      text: chunk.text.trim()
    };
  });
}
