import { EditorState, SubtitleChunk } from '@/types/editor';
import { extractAudioTrack, transcribeAudio } from '@/utils/transcribeVideo';
import { TRANSCRIBE_MODEL } from './videoEditorDefaults';

export interface SubtitleControllers {
  transcribeLanguage: 'en' | 'ur' | 'auto';
  setTranscribeLanguage: (language: 'en' | 'ur' | 'auto') => void;
  isTranscribing: boolean;
  transcribeStatus: string;
  handleSubtitlesChange: (chunks: SubtitleChunk[]) => void;
  handleTranscribeLanguageChange: (language: 'en' | 'ur' | 'auto') => void;
  handleAutoTranscribe: () => Promise<void>;
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
      const audioData = await extractAudioTrack(state.videoFile);
      const chunks = await transcribeAudio(
        audioData,
        TRANSCRIBE_MODEL,
        (message) => setTranscribeStatus(message),
        transcribeLanguage
      );
      const normalized = chunks
        .filter((chunk) => chunk.text.trim())
        .map((chunk, i) => ({
          ...chunk,
          id: `transcribed-${i + 1}`,
          startTime: Number(chunk.startTime.toFixed(2)),
          endTime: Number(chunk.endTime.toFixed(2)),
        }));

      if (normalized.length === 0) setTranscribeStatus('No subtitle text found.');
      else setTranscribeStatus(`Transcription complete (${normalized.length} lines).`);
      set({ subtitles: normalized });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Transcription failed. Please try again.';
      setTranscribeStatus(message);
    } finally {
      setIsTranscribing(false);
    }
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
    handleSubtitleFontScaleChange,
    handleSubtitleFontFamilyChange,
    handleAudioMuteToggle,
    handleAudioRemove,
  };
}
