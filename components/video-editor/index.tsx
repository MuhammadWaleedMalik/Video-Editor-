'use client';

import { useState, useRef, useCallback } from 'react';
import { EditorState, SubtitleChunk, SplitPoint, SmartTrimSegment, VideoFormat, Layer, ImageLayer, TextLayer, AudioLayer, TrimSegment } from '@/types/editor';
import EditorHeader from './EditorHeader';
import LeftSidebar from './LeftSidebar';
import VideoPreview from './VideoPreview';
import AIToolsPanel from './AIToolsPanel';
import SubtitlesPanel from './SubtitlesPanel';
import LayersPanel from './LayersPanel';
import SegmentsPanel from './SegmentsPanel';
import Timeline from './Timeline';
import VideoUpload from './VideoUpload';
import PreviewModal from './PreviewModal';

const initialState: EditorState = {
  videoFile: null,
  videoUrl: null,
  audioUrl: null,
  audioBlob: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  trimStart: 0,
  trimEnd: 0,
  trimSegments: [],
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
  const [rightPanel, setRightPanel] = useState<'segments' | 'layers'>('segments');
  const videoRef = useRef<HTMLVideoElement>(null);

  const set = useCallback((patch: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ── Video upload ── */
  function handleVideoUpload(file: File) {
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    const url = URL.createObjectURL(file);
    setWaveformData(null);
    
    // Create initial trim segment (keep full video/audio by default)
    const initialTrimSegment: TrimSegment = {
      id: crypto.randomUUID(),
      startTime: 0,
      endTime: 0, // Will be set when duration is available
      trackType: 'both',
    };

    set({
      videoFile: file,
      videoUrl: url,
      audioUrl: url, // Same URL contains audio
      audioBlob: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      trimSegments: [initialTrimSegment],
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
      const firstSegment = state.trimSegments[0];
      if (firstSegment && v.currentTime < firstSegment.startTime) {
        v.currentTime = firstSegment.startTime;
      }
      v.play();
      set({ isPlaying: true });
    }
  }

  function handleTimeUpdate(time: number) {
    // Check if time exceeds any trim segment end
    let shouldStop = false;
    for (const segment of state.trimSegments) {
      if (time >= segment.endTime && segment.endTime > 0) {
        shouldStop = true;
        break;
      }
    }
    
    if (shouldStop) {
      videoRef.current?.pause();
      set({ isPlaying: false, currentTime: time });
      return;
    }
    set({ currentTime: time });
  }

  function handleDurationChange(duration: number) {
    // Update initial trim segment to full duration
    set({
      duration,
      trimSegments: state.trimSegments.map((seg) =>
        seg.id === state.trimSegments[0]?.id ? { ...seg, endTime: duration } : seg
      ),
    });
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
    // Simulate 1.8 s processing
    await new Promise((r) => setTimeout(r, 1800));
    set({ noiseRemoveApplied: true });
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

  /* ── Trim Segments ── */
  function handleAddTrimSegment(startTime: number, endTime: number, trackType: 'video' | 'audio' | 'both' = 'both') {
    const newSegment: TrimSegment = {
      id: crypto.randomUUID(),
      startTime,
      endTime,
      trackType,
    };
    set({
      trimSegments: [...state.trimSegments, newSegment],
    });
  }

  function handleUpdateTrimSegment(segmentId: string, updates: Partial<TrimSegment>) {
    set({
      trimSegments: state.trimSegments.map((seg) =>
        seg.id === segmentId ? { ...seg, ...updates } : seg
      ),
    });
  }

  function handleDeleteTrimSegment(segmentId: string) {
    set({
      trimSegments: state.trimSegments.filter((seg) => seg.id !== segmentId),
    });
  }

  function handleTrimSegmentsFromSmartTrim() {
    if (!state.duration || state.smartTrimSegments.length === 0) return;
    
    // Create trim segments from smart trim results
    const newSegments: TrimSegment[] = state.smartTrimSegments
      .filter(seg => seg.keep)
      .map(seg => ({
        id: crypto.randomUUID(),
        startTime: seg.startTime,
        endTime: seg.endTime,
        trackType: 'both' as const,
      }));
    
    set({ trimSegments: newSegments });
  }

  /* ── Layers ── */
  function handleAddImageLayer() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const newLayer: ImageLayer = {
        id: crypto.randomUUID(),
        type: 'image',
        src: url,
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        opacity: 1,
        zIndex: state.layers.length,
        startTime: state.currentTime,
        endTime: Math.min(state.currentTime + 5, state.duration),
        borderRadius: 0,
        borderWidth: 0,
        borderColor: '#000000',
        scale: 1,
        rotation: 0,
      };
      set({
        layers: [...state.layers, newLayer],
        selectedLayerId: newLayer.id,
      });
    };
    input.click();
  }

  function handleAddTextLayer() {
    const newLayer: TextLayer = {
      id: crypto.randomUUID(),
      type: 'text',
      text: 'New Text',
      x: 100,
      y: 100,
      width: 300,
      height: 80,
      fontSize: 24,
      color: '#ffffff',
      fontFamily: 'Arial',
      opacity: 1,
      zIndex: state.layers.length,
      startTime: state.currentTime,
      endTime: Math.min(state.currentTime + 5, state.duration),
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      padding: 8,
      borderRadius: 4,
      textAlign: 'center',
      fontWeight: 'normal',
    };
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  function handleAddAudioLayer() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const newLayer: AudioLayer = {
        id: crypto.randomUUID(),
        type: 'audio',
        src: url,
        volume: 1,
        startTime: state.currentTime,
        endTime: Math.min(state.currentTime + 5, state.duration),
        zIndex: state.layers.length,
      };
      set({
        layers: [...state.layers, newLayer],
        selectedLayerId: newLayer.id,
      });
    };
    input.click();
  }

  function handleUpdateLayer(layerId: string, updates: Partial<Layer>) {
    set({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } as Layer : layer
      ),
    });
  }

  function handleDeleteLayer(layerId: string) {
    set({
      layers: state.layers.filter((layer) => layer.id !== layerId),
      selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
    });
  }

  function handleSelectLayer(layerId: string | null) {
    set({ selectedLayerId: layerId });
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
          onAddImage={handleAddImageLayer}
          onAddText={handleAddTextLayer}
          onAddAudio={handleAddAudioLayer}
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
                layers={state.layers}
                selectedLayerId={state.selectedLayerId}
                onPlayPause={handlePlayPause}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onUpdateLayer={handleUpdateLayer}
                onSelectLayer={handleSelectLayer}
                videoRef={videoRef}
              />
            </div>
          </>
        ) : (
          <VideoUpload onVideoUpload={handleVideoUpload} />
        )}

        {/* Right: panels */}
        {hasVideo && (
          <div className="w-56 shrink-0 border-l border-[#3d2510] flex flex-col overflow-hidden bg-[#120a02]">
            {/* Panel tabs */}
            <div className="flex border-b border-[#3d2510]">
              <button
                onClick={() => setRightPanel('segments')}
                className={`flex-1 text-xs font-bold py-2 px-3 transition-colors ${
                  rightPanel === 'segments'
                    ? 'border-b-2 border-[#c9b600] text-[#c9b600]'
                    : 'text-[#5a4530] hover:text-[#c8b88a]'
                }`}
              >
                Segments
              </button>
              <button
                onClick={() => setRightPanel('layers')}
                className={`flex-1 text-xs font-bold py-2 px-3 transition-colors ${
                  rightPanel === 'layers'
                    ? 'border-b-2 border-[#c9b600] text-[#c9b600]'
                    : 'text-[#5a4530] hover:text-[#c8b88a]'
                }`}
              >
                Layers
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden">
              {rightPanel === 'segments' ? (
                <SegmentsPanel
                  segments={state.trimSegments}
                  duration={state.duration}
                  currentTime={state.currentTime}
                  onAddSegment={handleAddTrimSegment}
                  onUpdateSegment={handleUpdateTrimSegment}
                  onDeleteSegment={handleDeleteTrimSegment}
                  onSeek={handleSeek}
                />
              ) : (
                <LayersPanel
                  layers={state.layers}
                  selectedLayerId={state.selectedLayerId}
                  onSelectLayer={handleSelectLayer}
                  onUpdateLayer={handleUpdateLayer}
                  onDeleteLayer={handleDeleteLayer}
                />
              )}
            </div>
          </div>
        )}

        {/* Right: subtitles (optional, can be toggled) */}
        {hasVideo && false && (
          <SubtitlesPanel
            subtitles={state.subtitles}
            currentTime={state.currentTime}
            duration={state.duration}
            onSubtitlesChange={handleSubtitlesChange}
            onSeek={handleSeek}
          />
        )}
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
        />
      )}
    </div>
  );
}
