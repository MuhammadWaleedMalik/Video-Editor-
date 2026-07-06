import { useCallback } from 'react';
import { EditorState, VideoFormat } from '@/types/editor';
import { getSegmentAtOrAfter, getSegmentIndex, getTrimSegments, sanitizeTrimRange } from './segments';

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

  function handlePlayPause() {
    const v = videoRef.current;
    if (!v) return;
    if (state.isPlaying) {
      v.pause();
      set({ isPlaying: false });
      return;
    }

    const next = getSegmentAtOrAfter(trimSegments, state.currentTime);
    if (state.duration && state.currentTime >= state.trimEnd) {
      v.currentTime = state.trimStart;
      set({ currentTime: state.trimStart });
    } else if (next && next.startTime >= 0) {
      const seekTo = state.currentTime < next.startTime ? next.startTime : state.currentTime;
      v.currentTime = seekTo;
      set({ currentTime: seekTo });
    } else {
      v.currentTime = state.trimStart;
      set({ currentTime: state.trimStart });
    }

    if (!trimSegments.length) return;
    v.play().then(() => set({ isPlaying: true })).catch(() => set({ isPlaying: false }));
  }

  function handleTimeUpdate(time: number) {
    const video = videoRef.current;
    const { trimEnd } = sanitizeTrimRange(state.duration, state.trimStart, state.trimEnd);
    const segmentIndex = getSegmentIndex(trimSegments, time);

    if (!trimSegments.length) {
      set({ currentTime: Math.max(0, Math.min(trimEnd, time)) });
      return;
    }

    if (segmentIndex === -1) {
      const next = trimSegments.find((segment) => segment.startTime > time);
      if (next && video && state.isPlaying) {
        video.currentTime = next.startTime;
        return;
      }
      if (!state.isPlaying) {
        const active = getSegmentAtOrAfter(trimSegments, time);
        set({ currentTime: active?.startTime ?? state.currentTime });
      }
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
    const targetSegment = getSegmentAtOrAfter(trimSegments, time);
    const seekTo = targetSegment
      ? time < targetSegment.startTime
        ? targetSegment.startTime
        : Math.min(time, targetSegment.endTime)
      : state.currentTime;
    if (videoRef.current) videoRef.current.currentTime = seekTo;
    set({ currentTime: seekTo });
  }

  function handleFormatChange(format: VideoFormat) {
    set({ format });
  }

  function handleTrimChange(start: number, end: number) {
    const range = sanitizeTrimRange(state.duration, start, end);
    const next = getSegmentAtOrAfter(getTrimSegments(state.duration, range.trimStart, range.trimEnd), state.currentTime);
    const nextCurrentTime = next ? Math.min(state.currentTime, next.endTime) : range.trimStart;
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
