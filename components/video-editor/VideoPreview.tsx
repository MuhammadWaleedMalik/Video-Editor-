'use client';

/* eslint-disable @next/next/no-img-element */

import { CanvasObject, Layer, LayerType, MediaAsset, SubtitleChunk, TimelineClip, VideoFormat } from '@/types/editor';
import VideoCanvasStage from './VideoCanvasStage';
import VideoPlaybackControls from './VideoPlaybackControls';
import { useVideoPreviewController } from './useVideoPreviewController';

interface VideoPreviewProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  subtitles: SubtitleChunk[];
  format: VideoFormat;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
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
  mediaAssets: MediaAsset[];
  timelineClips: TimelineClip[];
  canvasObjects: CanvasObject[];
  selectedLayerId: string | null;
  selectedClipId: string | null;
  selectedCanvasObjectId: string | null;
  onSelectLayer: (id: string | null) => void;
  onSelectClip: (id: string | null) => void;
  onUpdateLayer: (layer: Layer) => void;
  onUpdateCanvasObject: (object: CanvasObject) => void;
  onAddLayerAtCoords: (type: Exclude<LayerType, 'audio'>, x: number, y: number) => void;
}

export default function VideoPreview({
  videoUrl,
  isPlaying,
  currentTime,
  trimStart,
  trimEnd,
  subtitles,
  format,
  onPlayPause,
  onSeek,
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
  mediaAssets,
  timelineClips,
  canvasObjects,
  selectedLayerId,
  selectedClipId,
  selectedCanvasObjectId,
  onSelectLayer,
  onSelectClip,
  onUpdateLayer,
  onUpdateCanvasObject,
  onAddLayerAtCoords,
}: VideoPreviewProps) {
  const hasCanvasContent = timelineClips.length > 0 || layers.some((layer) => layer.type !== 'audio');
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
    onSelectClip,
    layers,
    mediaAssets,
    timelineClips,
    canvasObjects,
    selectedLayerId,
    selectedClipId,
    selectedCanvasObjectId,
    currentTime,
    onUpdateCanvasObject,
    audioMuted,
    playbackRate,
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 overflow-hidden p-3 sm:p-4">
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
        canvasCursor={refs.canvasCursor}
        onEditStart={refs.setEditingTextId}
        onTextChange={refs.handleTextChange}
        onUpdateLayer={onUpdateLayer}
        onLayerMouseDown={refs.handleLayerMouseDown}
        onCanvasPointerMove={refs.handleCanvasPointerMove}
        onCanvasPointerLeave={refs.handleCanvasPointerLeave}
        containerStyle={refs.containerStyle}
      />

      {hasCanvasContent ? (
        <VideoPlaybackControls
          playbackRate={playbackRate}
          currentTime={currentTime}
          trimStart={trimStart}
          trimEnd={trimEnd}
          audioMuted={audioMuted}
          isPlaying={isPlaying}
          onReset={() => {
            if (videoRef.current) videoRef.current.currentTime = trimStart;
            onSeek(trimStart);
          }}
          onToggleMute={onToggleMute}
          onPlayPause={onPlayPause}
          onSeek={onSeek}
          onSpeedChange={onPlaybackRateChange}
        />
      ) : null}
    </div>
  );
}
