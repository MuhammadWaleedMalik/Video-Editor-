import { useEffect, useRef } from 'react';
import { EditorState, SubtitleChunk } from '@/types/editor';
import { createProgressiveWhisperFromFile, ProgressiveWhisperController } from '@/src/lib/transcription';
import { TRANSCRIBE_MODEL } from './videoEditorDefaults';
import { renderEditedProjectForTranscription } from './renderEditedProject';

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
  const renderAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      renderAbortRef.current?.abort();
      transcriptionRef.current?.cancel();
    };
  }, []);

  function handleSubtitlesChange(chunks: SubtitleChunk[]) {
    set({ subtitles: chunks });
  }

  function handleTranscribeLanguageChange(language: 'en' | 'ur' | 'auto') {
    setTranscribeLanguage(language);
  }

  async function handleAutoTranscribe() {
    const hasMainVideoAudio = state.timelineClips.some((clip) => {
      const asset = state.mediaAssets.find((item) => item.id === clip.assetId);
      return asset?.type === 'video' && asset.status === 'deployed' && !clip.muted;
    });

    if (!hasMainVideoAudio) {
      setTranscribeStatus('Add an unmuted video to the main timeline before auto transcribing.');
      return;
    }

    setIsTranscribing(true);
    set({ isPlaying: false });
    setTranscribeStatus('Rendering edited project for transcription...');
    try {
      renderAbortRef.current?.abort();
      transcriptionRef.current?.cancel();
      const renderAbort = new AbortController();
      renderAbortRef.current = renderAbort;
      const editedProjectFile = await renderEditedProjectForTranscription(state, {
        fileName: 'edited-canvas-transcription.webm',
        onProgress: setTranscribeStatus,
        signal: renderAbort.signal,
      });
      renderAbortRef.current = null;
      setTranscribeStatus('Extracting audio from edited project...');
      const controller = createProgressiveWhisperFromFile(editedProjectFile, {
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
      renderAbortRef.current = null;
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
    renderAbortRef.current?.abort();
    renderAbortRef.current = null;
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
