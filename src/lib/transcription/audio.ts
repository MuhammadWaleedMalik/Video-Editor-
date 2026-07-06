export interface ExtractedAudio {
  audio: Float32Array;
  sampleRate: 16000;
}

export interface AudioExtractionCallbacks {
  onProgress?: (progress: number, message: string) => void;
}

function getAudioContext() {
  const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }
  return AudioContextClass;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  if (!channels) throw new Error('No audio channels found in this media file.');

  const mono = new Float32Array(buffer.length);
  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const data = buffer.getChannelData(channelIndex);
    for (let i = 0; i < data.length; i += 1) {
      mono[i] += data[i] / channels;
    }
  }
  return mono;
}

export async function extractAudioFromFile(
  file: File,
  callbacks: AudioExtractionCallbacks = {}
): Promise<ExtractedAudio> {
  callbacks.onProgress?.(0, 'Reading media file...');
  const sourceData = await file.arrayBuffer();

  callbacks.onProgress?.(0.2, 'Decoding audio...');
  const AudioContextClass = getAudioContext();
  const decodeContext = new AudioContextClass();
  const decoded = await decodeContext.decodeAudioData(sourceData.slice(0));
  await decodeContext.close();

  callbacks.onProgress?.(0.55, 'Resampling audio to 16 kHz...');
  const targetRate = 16000;
  const targetLength = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OfflineAudioContext(1, targetLength, targetRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();
  callbacks.onProgress?.(0.9, 'Preparing mono audio...');
  const mono = mixToMono(rendered);

  callbacks.onProgress?.(1, 'Audio ready.');
  return { audio: mono, sampleRate: targetRate };
}
