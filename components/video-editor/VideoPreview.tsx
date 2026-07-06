'use client';

/* eslint-disable @next/next/no-img-element */

import { Layer, LayerType, SubtitleChunk, VideoFormat } from '@/types/editor';
import VideoCanvasStage from './VideoCanvasStage';
import VideoPlaybackControls from './VideoPlaybackControls';
import { useVideoPreviewController } from './useVideoPreviewController';

interface VideoPreviewProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  subtitles: SubtitleChunk[];
  format: VideoFormat;
  onPlayPause: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  subtitleFontScale: number;
  subtitleFontFamily: string;
  audioMuted: boolean;
  playbackRate: number;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (layer: Layer) => void;
  onAddLayerAtCoords: (type: Exclude<LayerType, 'audio'>, x: number, y: number) => void;
}

export default function VideoPreview({
  videoUrl,
  isPlaying,
  currentTime,
  subtitles,
  format,
  onPlayPause,
  onTimeUpdate,
  onDurationChange,
  subtitleFontScale,
  subtitleFontFamily,
  audioMuted,
  playbackRate,
  onToggleMute,
  onPlaybackRateChange,
  videoRef,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onAddLayerAtCoords,
}: VideoPreviewProps) {
  const { refs } = useVideoPreviewController({
    videoRef,
    isPlaying,
    subtitles,
    format,
    subtitleFontScale,
    subtitleFontFamily,
    onUpdateLayer,
    onAddLayerAtCoords,
    onSelectLayer,
    layers,
    audioMuted,
    playbackRate,
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden p-2 sm:p-3">
      <div className="flex h-5 shrink-0 items-center gap-2">
        <span className="ml-auto text-[10px] text-[#5a4530] font-mono">{format}</span>
      </div>

      <VideoCanvasStage
        videoRef={videoRef}
        canvasRef={refs.canvasRef}
        viewportRef={refs.viewportRef}
        containerRef={refs.containerRef}
        layers={layers}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onPlayPause={onPlayPause}
        onDrop={refs.handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onContainerClick={refs.handleContainerClick}
        onSelectLayer={onSelectLayer}
        selectedLayerId={selectedLayerId}
        editingTextId={refs.editingTextId}
        onEditStart={refs.setEditingTextId}
        onTextChange={refs.handleTextChange}
        onUpdateLayer={onUpdateLayer}
        onLayerMouseDown={refs.handleLayerMouseDown}
        containerStyle={refs.containerStyle}
      />

      <VideoPlaybackControls
        playbackRate={playbackRate}
        currentTime={currentTime}
        audioMuted={audioMuted}
        isPlaying={isPlaying}
        onReset={() => {
          if (videoRef.current) videoRef.current.currentTime = 0;
        }}
        onToggleMute={onToggleMute}
        onPlayPause={onPlayPause}
        onSpeedChange={onPlaybackRateChange}
      />

      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        muted={audioMuted}
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onDurationChange={(e) => onDurationChange(e.currentTarget.duration)}
        onLoadedData={() => refs.drawFrame()}
        onSeeked={() => refs.drawFrame()}
      />
    </div>
  );
}
