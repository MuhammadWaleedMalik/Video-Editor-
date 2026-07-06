import { useCallback } from 'react';
import { EditorState, VideoFormat } from '@/types/editor';
import { getSegmentIndex, sanitizeTrimRange } from './segments';

export interface PlaybackControllers {
  trimSegments: Array<{ startTime: number; endTime: number }>;
  handlePlayPause: () => void;
  handleTimeUpdate: (time: number) => void;
  handleDurationChange: (duration: number) => void;
  handleSeek: (time: number) => void;
  handleFormatChange: (format: VideoFormat) => void;
  handleTrimChange: (start: number, end: number) => void;
  handlePlaybackRateChange: (playbackRate: number) => void;
}

export function usePlaybackControllers(
  state: EditorState,
  setState: (patch: Partial<EditorState>) => void,
  trimSegments: Array<{ startTime: number; endTime: number }>,
  videoRef: React.RefObject<HTMLVideoElement>
): PlaybackControllers {
  const set = useCallback((patch: Partial<EditorState>) => {
    setState({ ...patch });
  }, [setState]);

  function clampToTrim(time: number) {
    const range = sanitizeTrimRange(state.duration, state.trimStart, state.trimEnd);
    return Math.max(range.trimStart, Math.min(time, range.trimEnd));
  }

  function handlePlayPause() {
    const v = videoRef.current;
    if (!v) return;
    if (state.isPlaying) {
      v.pause();
      set({ isPlaying: false });
      return;
    }

    const range = sanitizeTrimRange(state.duration, state.trimStart, state.trimEnd);
    const inTrim = state.currentTime >= range.trimStart && state.currentTime < range.trimEnd;
    const seekTo = inTrim ? state.currentTime : range.trimStart;
    v.currentTime = seekTo;
    set({ currentTime: seekTo });

    if (!trimSegments.length) return;
    v.play().then(() => set({ isPlaying: true })).catch(() => set({ isPlaying: false }));
  }

  function handleTimeUpdate(time: number) {
    const video = videoRef.current;
    const { trimStart, trimEnd } = sanitizeTrimRange(state.duration, state.trimStart, state.trimEnd);
    const segmentIndex = getSegmentIndex(trimSegments, time);

    if (!trimSegments.length) {
      set({ currentTime: Math.max(0, Math.min(trimEnd, time)) });
      return;
    }

    if (time < trimStart) {
      if (video) video.currentTime = trimStart;
      set({ currentTime: trimStart });
      return;
    }

    if (segmentIndex === -1) {
      if (time > trimEnd && video) {
        video.pause();
        video.currentTime = trimEnd;
        set({ isPlaying: false, currentTime: trimEnd });
        return;
      }
      set({ currentTime: clampToTrim(time) });
      return;
    }

    const segment = trimSegments[segmentIndex];
    if (state.isPlaying && segment && time >= segment.endTime - 0.03) {
      const nextSegment = trimSegments[segmentIndex + 1];
      if (nextSegment) {
        if (!video) return;
        video.pause();
        video.currentTime = nextSegment.startTime;
        set({ currentTime: nextSegment.startTime });
        return;
      }
      if (video) video.pause();
      set({ isPlaying: false, currentTime: segment.endTime });
      return;
    }

    if (time > trimEnd) {
      if (!video) return;
      video.pause();
      set({ isPlaying: false, currentTime: trimEnd });
      return;
    }
    set({ currentTime: time });
  }

  function handleDurationChange(duration: number) {
    const next = sanitizeTrimRange(duration, state.trimStart, duration);
    set({
      duration,
      trimStart: next.trimStart,
      trimEnd: next.trimEnd,
    });
  }

  function handleSeek(time: number) {
    const seekTo = clampToTrim(time);
    if (videoRef.current) videoRef.current.currentTime = seekTo;
    set({ currentTime: seekTo });
  }

  function handleFormatChange(format: VideoFormat) {
    set({ format });
  }

  function handleTrimChange(start: number, end: number) {
    const range = sanitizeTrimRange(state.duration, start, end);
    const nextCurrentTime = Math.max(range.trimStart, Math.min(state.currentTime, range.trimEnd));
    set({ trimStart: range.trimStart, trimEnd: range.trimEnd, currentTime: nextCurrentTime });
    if (videoRef.current) videoRef.current.currentTime = nextCurrentTime;
  }

  function handlePlaybackRateChange(playbackRate: number) {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
    set({ playbackRate });
  }

  return {
    trimSegments,
    handlePlayPause,
    handleTimeUpdate,
    handleDurationChange,
    handleSeek,
    handleFormatChange,
    handleTrimChange,
    handlePlaybackRateChange,
  };
}
