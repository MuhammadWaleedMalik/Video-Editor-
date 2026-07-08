import { useCallback, useEffect, useRef } from 'react';
import { EditorState, VideoFormat } from '@/types/editor';
import { clampPlayhead, clampProjectDuration } from './timelineModel';

const PREVIEW_PLAYBACK_FPS = 30;
const PREVIEW_PLAYBACK_FRAME_MS = 1000 / PREVIEW_PLAYBACK_FPS;

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
  const lastPublishRef = useRef<number | null>(null);
  const currentTimeRef = useRef(state.currentTime);
  const playbackRateRef = useRef(state.playbackRate);
  const durationRef = useRef(state.duration);
  const set = useCallback((patch: Partial<EditorState>) => {
    setState({ ...patch });
  }, [setState]);

  const timelineDuration = state.duration;

  useEffect(() => {
    currentTimeRef.current = state.currentTime;
  }, [state.currentTime]);

  useEffect(() => {
    playbackRateRef.current = state.playbackRate;
  }, [state.playbackRate]);

  useEffect(() => {
    durationRef.current = state.duration;
  }, [state.duration]);

  useEffect(() => {
    if (!state.isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
      lastTickRef.current = null;
      lastPublishRef.current = null;
      return;
    }

    const step = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      if (lastPublishRef.current == null) lastPublishRef.current = now;
      const duration = durationRef.current;
      const delta = ((now - lastTickRef.current) / 1000) * playbackRateRef.current;
      lastTickRef.current = now;
      const next = clampPlayhead(currentTimeRef.current + delta, duration);
      currentTimeRef.current = next;

      if (duration <= 0 || next >= duration) {
        set({ currentTime: duration, isPlaying: false });
        return;
      }

      if (now - lastPublishRef.current >= PREVIEW_PLAYBACK_FRAME_MS) {
        lastPublishRef.current = now;
        set({ currentTime: next });
      }
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state.isPlaying, set]);

  function handlePlayPause() {
    if (state.isPlaying) {
      if (videoRef.current) videoRef.current.pause();
      set({ currentTime: currentTimeRef.current, isPlaying: false });
      return;
    }
    if (timelineDuration <= 0) {
      set({ currentTime: 0, isPlaying: false });
      return;
    }
    const seekTo = state.currentTime >= timelineDuration ? 0 : clampPlayhead(state.currentTime, timelineDuration);
    currentTimeRef.current = seekTo;
    if (videoRef.current) videoRef.current.currentTime = seekTo;
    set({ currentTime: seekTo, isPlaying: true });
  }

  function handleTimeUpdate(time: number) {
    const clamped = clampPlayhead(time, timelineDuration);
    currentTimeRef.current = clamped;
    if (videoRef.current) videoRef.current.currentTime = clamped;
    set({ currentTime: clamped });
  }

  function handleDurationChange(duration: number) {
    const safeDuration = clampProjectDuration(duration);
    set({
      duration: safeDuration,
      trimStart: 0,
      trimEnd: safeDuration,
    });
  }

  function handleSeek(time: number) {
    const clamped = clampPlayhead(time, timelineDuration);
    currentTimeRef.current = clamped;
    if (videoRef.current) videoRef.current.currentTime = clamped;
    set({ currentTime: clamped });
  }

  function handleFormatChange(format: VideoFormat) {
    set({ format });
  }

  function handlePlaybackRateChange(playbackRate: number) {
    playbackRateRef.current = playbackRate;
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
