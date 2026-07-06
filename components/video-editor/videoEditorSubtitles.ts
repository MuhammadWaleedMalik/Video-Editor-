import { useEffect, useRef } from 'react';
import { EditorState, SubtitleChunk } from '@/types/editor';
import { createProgressiveWhisperFromFile, ProgressiveWhisperController } from '@/src/lib/transcription';
import { TRANSCRIBE_MODEL } from './videoEditorDefaults';

export interface SubtitleControllers {
  transcribeLanguage: 'en' | 'ur' | 'auto';
  setTranscribeLanguage: (language: 'en' | 'ur' | 'auto') => void;
  isTranscribing: boolean;
  transcribeStatus: string;
  handleSubtitlesChange: (chunks: SubtitleChunk[]) => void;
  handleTranscribeLanguageChange: (language: 'en' | 'ur' | 'auto') => void;
  handleAutoTranscribe: () => Promise<void>;
  handleTranscribePause: () => void;
  handleTranscribeResume: () => void;
  handleTranscribeCancel: () => void;
  handleSubtitleFontScaleChange: (scalePercent: number) => void;
  handleSubtitleFontFamilyChange: (fontFamily: string) => void;
  handleAudioMuteToggle: () => void;
  handleAudioRemove: () => void;
}

export function useSubtitleControllers(
  state: EditorState,
  setState: (patch: Partial<EditorState>) => void,
  videoRef: React.RefObject<HTMLVideoElement>,
  transcribeLanguage: 'en' | 'ur' | 'auto',
  setTranscribeLanguage: (language: 'en' | 'ur' | 'auto') => void,
  isTranscribing: boolean,
  setIsTranscribing: (value: boolean) => void,
  transcribeStatus: string,
  setTranscribeStatus: (status: string) => void,
  setWaveformData: (value: Float32Array | null) => void
): SubtitleControllers {

  const set = (patch: Partial<EditorState>) => setState(patch);
  const transcriptionRef = useRef<ProgressiveWhisperController | null>(null);

  useEffect(() => {
    return () => transcriptionRef.current?.cancel();
  }, []);

  function handleSubtitlesChange(chunks: SubtitleChunk[]) {
    set({ subtitles: chunks });
  }

  function handleTranscribeLanguageChange(language: 'en' | 'ur' | 'auto') {
    setTranscribeLanguage(language);
  }

  async function handleAutoTranscribe() {
    if (!state.videoFile) {
      setTranscribeStatus('Upload a video first.');
      return;
    }

    setIsTranscribing(true);
    setTranscribeStatus('Preparing audio...');
    try {
      transcriptionRef.current?.cancel();
      const controller = createProgressiveWhisperFromFile(state.videoFile, {
        modelName: TRANSCRIBE_MODEL,
        language: transcribeLanguage,
        dtype: 'q8',
        preferWebGPU: true,
        onProgress: (event) => setTranscribeStatus(event.message),
        onSubtitles: (chunks) => {
          const normalized = normalizeSubtitleChunks(chunks);
          set({ subtitles: normalized });
          setTranscribeStatus(`Transcribing... ${normalized.length} lines ready.`);
        },
        onComplete: (chunks) => {
          const normalized = normalizeSubtitleChunks(chunks);
          set({ subtitles: normalized });
          setTranscribeStatus(
            normalized.length ? `Transcription complete (${normalized.length} lines).` : 'No subtitle text found.'
          );
        },
      });
      transcriptionRef.current = controller;
      await controller.promise;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Transcription failed. Please try again.';
      setTranscribeStatus(message);
    } finally {
      transcriptionRef.current = null;
      setIsTranscribing(false);
    }
  }

  function normalizeSubtitleChunks(chunks: SubtitleChunk[]) {
    return chunks
      .filter((chunk) => chunk.text.trim())
      .map((chunk, i) => ({
        ...chunk,
        id: `transcribed-${i + 1}`,
        startTime: Number(chunk.startTime.toFixed(2)),
        endTime: Number(chunk.endTime.toFixed(2)),
      }));
  }

  function handleTranscribePause() {
    transcriptionRef.current?.pause();
    setTranscribeStatus('Transcription paused.');
  }

  function handleTranscribeResume() {
    transcriptionRef.current?.resume();
    setTranscribeStatus('Transcription resumed.');
  }

  function handleTranscribeCancel() {
    transcriptionRef.current?.cancel();
    transcriptionRef.current = null;
    setIsTranscribing(false);
    setTranscribeStatus('Transcription cancelled.');
  }

  function handleSubtitleFontScaleChange(scalePercent: number) {
    set({ subtitleFontScale: scalePercent });
  }

  function handleSubtitleFontFamilyChange(fontFamily: string) {
    set({ subtitleFontFamily: fontFamily });
  }

  function handleAudioMuteToggle() {
    if (videoRef.current) videoRef.current.muted = !state.audioMuted;
    set({ audioMuted: !state.audioMuted });
  }

  function handleAudioRemove() {
    if (videoRef.current) videoRef.current.muted = true;
    set({ hasAudio: false, audioMuted: true });
    setWaveformData(null);
  }

  return {
    transcribeLanguage,
    setTranscribeLanguage: handleTranscribeLanguageChange,
    isTranscribing,
    transcribeStatus,
    handleSubtitlesChange,
    handleTranscribeLanguageChange,
    handleAutoTranscribe,
    handleTranscribePause,
    handleTranscribeResume,
    handleTranscribeCancel,
    handleSubtitleFontScaleChange,
    handleSubtitleFontFamilyChange,
    handleAudioMuteToggle,
    handleAudioRemove,
  };
}
