import { useCallback, useEffect, useRef } from 'react';
import { EditorState, VideoFormat } from '@/types/editor';
import { clampPlayhead } from './timelineModel';

export interface PlaybackControllers {
  handlePlayPause: () => void;
  handleTimeUpdate: (time: number) => void;
  handleDurationChange: (duration: number) => void;
  handleSeek: (time: number) => void;
  handleFormatChange: (format: VideoFormat) => void;
  handlePlaybackRateChange: (playbackRate: number) => void;
}

export function usePlaybackControllers(
  state: EditorState,
  setState: (patch: Partial<EditorState>) => void,
  videoRef: React.RefObject<HTMLVideoElement>
): PlaybackControllers {
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const set = useCallback((patch: Partial<EditorState>) => {
    setState({ ...patch });
  }, [setState]);

  const timelineDuration = state.duration;

  useEffect(() => {
    if (!state.isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      lastTickRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const delta = ((now - lastTickRef.current) / 1000) * state.playbackRate;
      lastTickRef.current = now;
      const next = clampPlayhead(state.currentTime + delta, timelineDuration);
      if (timelineDuration <= 0 || next >= timelineDuration) {
        set({ currentTime: timelineDuration, isPlaying: false });
        return;
      }
      set({ currentTime: next });
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state.isPlaying, state.currentTime, state.playbackRate, timelineDuration, set]);

  function handlePlayPause() {
    if (state.isPlaying) {
      if (videoRef.current) videoRef.current.pause();
      set({ isPlaying: false });
      return;
    }
    if (timelineDuration <= 0) {
      set({ currentTime: 0, isPlaying: false });
      return;
    }
    const seekTo = state.currentTime >= timelineDuration ? 0 : clampPlayhead(state.currentTime, timelineDuration);
    if (videoRef.current) videoRef.current.currentTime = seekTo;
    set({ currentTime: seekTo, isPlaying: true });
  }

  function handleTimeUpdate(time: number) {
    const clamped = clampPlayhead(time, timelineDuration);
    if (videoRef.current) videoRef.current.currentTime = clamped;
    set({ currentTime: clamped });
  }

  function handleDurationChange(duration: number) {
    set({
      duration,
      trimStart: 0,
      trimEnd: duration,
    });
  }

  function handleSeek(time: number) {
    const clamped = clampPlayhead(time, timelineDuration);
    if (videoRef.current) videoRef.current.currentTime = clamped;
    set({ currentTime: clamped });
  }

  function handleFormatChange(format: VideoFormat) {
    set({ format });
  }

  function handlePlaybackRateChange(playbackRate: number) {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
    set({ playbackRate });
  }

  return {
    handlePlayPause,
    handleTimeUpdate,
    handleDurationChange,
    handleSeek,
    handleFormatChange,
    handlePlaybackRateChange,
  };
}
