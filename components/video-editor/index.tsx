'use client';

import { useState, useRef, useCallback } from 'react';
import { EditorState, SubtitleChunk, SplitPoint, SmartTrimSegment, VideoFormat, Layer } from '@/types/editor';
import EditorHeader from './EditorHeader';
import LeftSidebar from './LeftSidebar';
import VideoPreview from './VideoPreview';
import AIToolsPanel from './AIToolsPanel';
import SubtitlesPanel from './SubtitlesPanel';
import Timeline from './Timeline';
import VideoUpload from './VideoUpload';
import PreviewModal from './PreviewModal';

const initialState: EditorState = {
  videoFile: null,
  videoUrl: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  trimStart: 0,
  trimEnd: 0,
  splitPoints: [],
  subtitles: [],
  hasAudio: false,
  audioMuted: false,
  bgBlurEnabled: false,
  activePanel: 'ai',
  format: '16:9',
  noiseRemoveApplied: false,
  smartTrimSegments: [],
  layers: [],
  selectedLayerId: null,
};


async function extractWaveform(url: string): Promise<Float32Array | null> {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const ctx = new AudioContext();
    const audio = await ctx.decodeAudioData(buf);
    const ch = audio.getChannelData(0);
    const samples = 800;
    const block = Math.floor(ch.length / samples);
    const waveform = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const s = i * block;
      let max = 0;
      for (let j = 0; j < block; j++) {
        const abs = Math.abs(ch[s + j] ?? 0);
        if (abs > max) max = abs;
      }
      waveform[i] = max;
    }
    await ctx.close();
    return waveform;
  } catch {
    return null;
  }
}

/** Simulate smart trim: detect "silence" zones and split/trim accordingly */
function simulateSmartTrim(duration: number): {
  splitPoints: SplitPoint[];
  trimStart: number;
  trimEnd: number;
  segments: SmartTrimSegment[];
} {
  // Generate 3-5 evenly-distributed split points with small jitter
  const count = Math.max(2, Math.min(5, Math.floor(duration / 12)));
  const points: SplitPoint[] = [];
  const segments: SmartTrimSegment[] = [];

  let prev = 0;
  for (let i = 1; i <= count; i++) {
    const base = (duration / (count + 1)) * i;
    const jitter = (Math.random() - 0.5) * Math.min(6, duration * 0.08);
    const t = Math.max(2, Math.min(duration - 2, base + jitter));
    points.push({ id: crypto.randomUUID(), time: t, type: 'smart' });

    // Alternate keep / silence segments
    const keep = i % 2 === 1;
    segments.push({
      id: crypto.randomUUID(),
      startTime: prev,
      endTime: t,
      keep,
    });
    prev = t;
  }
  segments.push({
    id: crypto.randomUUID(),
    startTime: prev,
    endTime: duration,
    keep: true,
  });

  // Trim silence at start (0-2 s) and end (0-3 s)
  const trimStart = Math.round(Math.random() * 1.5 * 10) / 10;
  const trimEnd = duration - Math.round(Math.random() * 2.5 * 10) / 10;

  return {
    splitPoints: points.sort((a, b) => a.time - b.time),
    trimStart,
    trimEnd,
    segments,
  };
}

export default function VideoEditor() {
  const [state, setState] = useState<EditorState>(initialState);
  const [title, setTitle] = useState('My Video — Draft');
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const set = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ── Video upload ── */
  function handleVideoUpload(file: File) {
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    const url = URL.createObjectURL(file);
    setWaveformData(null);
    set({
      videoFile: file,
      videoUrl: url,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      trimStart: 0,
      trimEnd: 0,
      splitPoints: [],
      hasAudio: true,
      audioMuted: false,
      noiseRemoveApplied: false,
      smartTrimSegments: [],
    });
    extractWaveform(url).then((data) => { if (data) setWaveformData(data); });
  }

  /* ── Playback ── */
  function handlePlayPause() {
    const v = videoRef.current;
    if (!v) return;
    if (state.isPlaying) {
      v.pause();
      set({ isPlaying: false });
    } else {
      if (state.trimStart > 0 && v.currentTime < state.trimStart) v.currentTime = state.trimStart;
      v.play();
      set({ isPlaying: true });
    }
  }

  function handleTimeUpdate(time: number) {
    if (state.trimEnd > 0 && time >= state.trimEnd) {
      videoRef.current?.pause();
      set({ isPlaying: false, currentTime: state.trimEnd });
      return;
    }
    set({ currentTime: time });
  }

  function handleDurationChange(duration: number) {
    set({ duration, trimEnd: duration });
  }

  function handleSeek(time: number) {
    if (videoRef.current) videoRef.current.currentTime = time;
    set({ currentTime: time });
  }

  /* ── Format ── */
  function handleFormatChange(format: VideoFormat) {
    set({ format });
  }

  /* ── Trim / Split ── */
  function handleTrimChange(start: number, end: number) {
    set({ trimStart: start, trimEnd: end });
  }

  function handleSplit() {
    if (!state.duration) return;
    const point: SplitPoint = { id: crypto.randomUUID(), time: state.currentTime, type: 'manual' };
    set({ splitPoints: [...state.splitPoints, point] });
  }

  /* ── AI tools ── */
  async function handleNoiseRemove(): Promise<void> {
    if (state.noiseRemoveApplied) {
      set({ noiseRemoveApplied: false });
    } else {
      // Simulate 1.8 s processing
      await new Promise((r) => setTimeout(r, 1800));
      set({ noiseRemoveApplied: true });
    }
  }

  async function handleSmartTrim(): Promise<void> {
    if (!state.duration) return;
    // Simulate analysis delay
    await new Promise((r) => setTimeout(r, 2000));
    const result = simulateSmartTrim(state.duration);
    set({
      splitPoints: result.splitPoints,
      trimStart: result.trimStart,
      trimEnd: result.trimEnd,
      smartTrimSegments: result.segments,
    });
    if (videoRef.current) videoRef.current.currentTime = result.trimStart;
  }

  /* ── Canvas Layers ── */
  function createDefaultLayer(type: 'image' | 'video' | 'text', count: number, x = 30, y = 30): Layer {
    const id = crypto.randomUUID();
    switch (type) {
      case 'text':
        return {
          id,
          type,
          x,
          y,
          width: 40,
          height: 12,
          zIndex: count + 1,
          name: `Text ${count + 1}`,
          text: 'Double click to edit text',
          fontSize: 20,
          color: '#ffffff',
          bgColor: '#00000000',
        };
      case 'image':
        return {
          id,
          type,
          x,
          y,
          width: 35,
          height: 35,
          zIndex: count + 1,
          name: `Image ${count + 1}`,
          src: '', // empty for placeholder
        };
      case 'video':
        return {
          id,
          type,
          x,
          y,
          width: 40,
          height: 40,
          zIndex: count + 1,
          name: `Video ${count + 1}`,
          src: '', // empty for placeholder
        };
    }
  }

  function handleAddLayer(type: 'image' | 'video' | 'text') {
    const newLayer = createDefaultLayer(type, state.layers.length);
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  function handleAddLayerAtCoords(type: 'image' | 'video' | 'text', x: number, y: number) {
    const newLayer = createDefaultLayer(type, state.layers.length, x, y);
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  function handleUpdateLayer(updated: Layer) {
    set({
      layers: state.layers.map((l) => (l.id === updated.id ? updated : l)),
    });
  }

  function handleDeleteLayer(id: string) {
    set({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    });
  }

  function handleSelectLayer(id: string | null) {
    set({ selectedLayerId: id });
  }

  /* ── Subtitles ── */
  function handleSubtitlesChange(chunks: SubtitleChunk[]) {
    set({ subtitles: chunks });
  }

  /* ── Audio ── */
  function handleAudioMuteToggle() {
    if (videoRef.current) videoRef.current.muted = !state.audioMuted;
    set({ audioMuted: !state.audioMuted });
  }

  function handleAudioRemove() {
    if (videoRef.current) videoRef.current.muted = true;
    set({ hasAudio: false, audioMuted: true });
    setWaveformData(null);
  }

  const hasVideo = !!state.videoUrl;

  return (
    <div className="flex flex-col h-screen bg-[#1a0c05] overflow-hidden">
      <EditorHeader
        title={title}
        format={state.format}
        onTitleChange={setTitle}
        onFormatChange={handleFormatChange}
        onPreviewOpen={() => setShowPreview(true)}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <LeftSidebar
          layers={state.layers}
          selectedLayerId={state.selectedLayerId}
          onSelectLayer={handleSelectLayer}
          onAddLayer={handleAddLayer}
          onDeleteLayer={handleDeleteLayer}
        />

        {hasVideo ? (
          <>
            {/* Small left column: AI tools */}
            <div className="w-56 shrink-0 border-r border-[#3d2510] p-3 flex flex-col overflow-hidden">
              <AIToolsPanel
                bgBlurEnabled={state.bgBlurEnabled}
                noiseRemoveApplied={state.noiseRemoveApplied}
                hasVideo={hasVideo}
                onBgBlurToggle={() => set({ bgBlurEnabled: !state.bgBlurEnabled })}
                onNoiseRemove={handleNoiseRemove}
                onSmartTrim={handleSmartTrim}
              />
            </div>

            {/* Big center: video preview */}
            <div className="flex-1 p-3 flex flex-col overflow-hidden min-w-0">
              <VideoPreview
                videoUrl={state.videoUrl!}
                isPlaying={state.isPlaying}
                currentTime={state.currentTime}
                bgBlurEnabled={state.bgBlurEnabled}
                noiseRemoveApplied={state.noiseRemoveApplied}
                subtitles={state.subtitles}
                format={state.format}
                onPlayPause={handlePlayPause}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                videoRef={videoRef}
                layers={state.layers}
                selectedLayerId={state.selectedLayerId}
                onSelectLayer={handleSelectLayer}
                onUpdateLayer={handleUpdateLayer}
                onAddLayerAtCoords={handleAddLayerAtCoords}
              />
            </div>
          </>
        ) : (
          <VideoUpload onVideoUpload={handleVideoUpload} />
        )}

        {/* Right: subtitles / properties */}
        <SubtitlesPanel
          subtitles={state.subtitles}
          currentTime={state.currentTime}
          duration={state.duration}
          onSubtitlesChange={handleSubtitlesChange}
          onSeek={handleSeek}
          layers={state.layers}
          selectedLayerId={state.selectedLayerId}
          onUpdateLayer={handleUpdateLayer}
          onDeleteLayer={handleDeleteLayer}
          onSelectLayer={handleSelectLayer}
        />
      </div>

      {/* Timeline */}
      <Timeline
        duration={state.duration}
        currentTime={state.currentTime}
        trimStart={state.trimStart}
        trimEnd={state.trimEnd || state.duration}
        splitPoints={state.splitPoints}
        subtitles={state.subtitles}
        hasAudio={state.hasAudio}
        audioMuted={state.audioMuted}
        waveformData={waveformData}
        onSeek={handleSeek}
        onTrimChange={handleTrimChange}
        onSplit={handleSplit}
        onAudioMuteToggle={handleAudioMuteToggle}
        onAudioRemove={handleAudioRemove}
      />

      {/* Preview modal */}
      {showPreview && hasVideo && (
        <PreviewModal
          videoUrl={state.videoUrl!}
          format={state.format}
          subtitles={state.subtitles}
          trimStart={state.trimStart}
          trimEnd={state.trimEnd || state.duration}
          onClose={() => setShowPreview(false)}
          layers={state.layers}
        />
      )}
    </div>
  );
}
