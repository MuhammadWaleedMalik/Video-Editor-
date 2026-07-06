'use client';

import { useState, useRef, useCallback } from 'react';
import { EditorState, SubtitleChunk, VideoFormat, Layer, LayerType } from '@/types/editor';
import EditorHeader from './EditorHeader';
import LeftSidebar from './LeftSidebar';
import VideoPreview from './VideoPreview';
import SubtitlesPanel from './SubtitlesPanel';
import Timeline from './Timeline';
import VideoUpload from './VideoUpload';
import PreviewModal from './PreviewModal';
import { extractAudioTrack, transcribeAudio } from '@/utils/transcribeVideo';
import { Toaster, toast } from 'sonner';

const initialState: EditorState = {
  videoFile: null,
  videoUrl: null,
  duration: 0,
  currentTime: 0,
  isPlaying: false,
  trimStart: 0,
  trimEnd: 0,
  subtitles: [],
  hasAudio: false,
  audioMuted: false,
  format: '16:9',
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

export default function VideoEditor() {
  const [state, setState] = useState<EditorState>(initialState);
  const [title, setTitle] = useState('My Video — Draft');
  const [waveformData, setWaveformData] = useState<Float32Array | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('');
  const [whisperModel, setWhisperModel] = useState<'Xenova/whisper-tiny' | 'Xenova/whisper-small'>('Xenova/whisper-tiny');

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
      hasAudio: true,
      audioMuted: false,
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

  /* ── Canvas Layers ── */
  function createDefaultLayer(type: LayerType, count: number, x = 30, y = 30): Layer {
    const id = crypto.randomUUID();
    const startTime = Math.max(0, state.currentTime);
    const fallbackEnd = startTime + 5;
    const endTime = state.duration > 0 ? Math.min(state.duration, Math.max(startTime + 0.5, fallbackEnd)) : fallbackEnd;
    const label = type === 'audio' ? 'Audio' : `${type[0].toUpperCase()}${type.slice(1)}`;

    switch (type) {
      case 'audio':
        return {
          id,
          type,
          x,
          y,
          width: 18,
          height: 18,
          zIndex: count + 1,
          name: `${label} ${count + 1}`,
          startTime,
          endTime,
          src: '',
        };
      case 'text':
        return {
          id,
          type,
          x,
          y,
          width: 40,
          height: 12,
          zIndex: count + 1,
          name: `${label} ${count + 1}`,
          startTime,
          endTime,
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
          name: `${label} ${count + 1}`,
          startTime,
          endTime,
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
          name: `${label} ${count + 1}`,
          startTime,
          endTime,
          src: '', // empty for placeholder
        };
    }
  }

  function handleAddLayer(type: LayerType) {
    const newLayer = createDefaultLayer(type, state.layers.length);
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  function handleAddLayerAtCoords(type: Exclude<LayerType, 'audio'>, x: number, y: number) {
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

  function handleLayerTimingChange(id: string, startTime: number, endTime: number) {
    set({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, startTime, endTime } : layer
      ),
    });
  }

  function handleLayerZIndexChange(id: string, zIndex: number) {
    set({
      layers: state.layers.map((layer) => {
        if (layer.id !== id) return layer;
        return { ...layer, zIndex: Math.max(1, Math.floor(zIndex)) };
      }),
    });
  }

  /* ── Subtitles ── */
  function handleSubtitlesChange(chunks: SubtitleChunk[]) {
    set({ subtitles: chunks });
  }

  async function handleAutoTranscribe() {
    if (!state.videoFile) {
      toast.error('No video file loaded.');
      return;
    }
    setIsTranscribing(true);
    setTranscriptionStatus('Initializing Web Audio...');
    try {
      setTranscriptionStatus('Extracting audio track from media...');
      const audioData = await extractAudioTrack(state.videoFile);
      const transcribedSubs = await transcribeAudio(
        audioData,
        whisperModel,
        (status) => setTranscriptionStatus(status)
      );
      handleSubtitlesChange(transcribedSubs);
      toast.success(`Whisper transcription completed! Created ${transcribedSubs.length} subtitle cues.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Speech recognition failed.';
      toast.error(message);
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
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
            <div className="flex-1 p-2 flex flex-col overflow-hidden min-w-0">
              <VideoPreview
                videoUrl={state.videoUrl!}
                isPlaying={state.isPlaying}
                currentTime={state.currentTime}
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
          hasVideo={hasVideo}
          onAutoGenerate={handleAutoTranscribe}
          isTranscribing={isTranscribing}
          transcriptionStatus={transcriptionStatus}
          whisperModel={whisperModel}
          setWhisperModel={setWhisperModel}
        />
      </div>

      {/* Timeline */}
      <Timeline
        duration={state.duration}
        currentTime={state.currentTime}
        trimStart={state.trimStart}
        trimEnd={state.trimEnd || state.duration}
        subtitles={state.subtitles}
        layers={state.layers}
        selectedLayerId={state.selectedLayerId}
        hasAudio={state.hasAudio}
        audioMuted={state.audioMuted}
        waveformData={waveformData}
        onSeek={handleSeek}
        onTrimChange={handleTrimChange}
        onAudioMuteToggle={handleAudioMuteToggle}
        onAudioRemove={handleAudioRemove}
        onSelectLayer={handleSelectLayer}
        onLayerTimingChange={handleLayerTimingChange}
        onLayerZIndexChange={handleLayerZIndexChange}
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

      {/* Toast notifications */}
      <Toaster position="bottom-right" theme="dark" richColors />
    </div>
  );
}
