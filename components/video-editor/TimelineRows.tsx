import { Volume2, VolumeX } from 'lucide-react';
import { Layer, SubtitleChunk } from '@/types/editor';
import TrackRow from './TrackRow';
import Playhead from './Playhead';
import TimelineTickStrip from './TimelineTickStrip';
import TimelineLayerOrder from './TimelineLayerOrder';

interface TimelineRowsProps {
  dur: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  subtitles: SubtitleChunk[];
  layers: Layer[];
  hasAudio: boolean;
  audioMuted: boolean;
  timelineWidth: number;
  timeToPercent: (time: number) => string;
  audioTrackContent?: React.ReactNode;
  onMouseDown: (e: React.MouseEvent, target: 'playhead' | 'trim-start' | 'trim-end') => void;
  onLayerMouseDown: (
    e: React.MouseEvent,
    layer: Layer,
    mode: 'move' | 'start' | 'end'
  ) => void;
  selectedLayerId: string | null;
  onAudioMuteToggle: ()  => void;
  onAudioRemove: () => void;
  onLayerOrderChange: (id: string, direction: 'front' | 'back') => void;
}

export default function TimelineRows({
  dur,
  currentTime,
  trimStart,
  trimEnd,
  subtitles,
  layers,
  hasAudio,
  audioMuted,
  timelineWidth,
  timeToPercent,
  audioTrackContent,
  onMouseDown,
  selectedLayerId,
  onAudioMuteToggle,
  onAudioRemove,
  onLayerOrderChange,
  onLayerMouseDown,
}: TimelineRowsProps) {
  return (
    <>
      <TimelineTickStrip duration={dur} timeToPercent={timeToPercent} timelineWidth={timelineWidth} />

      <TrackRow label="Video" contentWidth={timelineWidth}>
        <div className="relative w-full h-full bg-[#1a0f04] rounded overflow-visible">
          <div className="absolute inset-0 bg-[#8b8c20] rounded opacity-70" />
          <div
            className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-l z-10"
            style={{ left: 0, width: timeToPercent(trimStart) }}
          />
          <div
            className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-r z-10"
            style={{ left: timeToPercent(trimEnd), right: 0 }}
          />

          <div
            className="absolute inset-y-0 w-3 bg-[#c9b600] rounded-l cursor-ew-resize z-30 flex items-center justify-center hover:bg-[#e0cc00] transition-colors"
            style={{ left: timeToPercent(trimStart) }}
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'trim-start'); }}
            title="Trim start"
          >
            <div className="w-px h-3 bg-[#1a0c05]" />
          </div>
          <div
            className="absolute inset-y-0 w-3 bg-[#c9b600] rounded-r cursor-ew-resize z-30 flex items-center justify-center hover:bg-[#e0cc00] transition-colors -translate-x-full"
            style={{ left: timeToPercent(trimEnd) }}
            onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'trim-end'); }}
            title="Trim end"
          >
            <div className="w-px h-3 bg-[#1a0c05]" />
          </div>

          <Playhead left={timeToPercent(currentTime)} />
        </div>
      </TrackRow>

      <TrackRow
        label="Audio"
        contentWidth={timelineWidth}
        controls={
          hasAudio ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onAudioMuteToggle(); }}
                title={audioMuted ? 'Unmute' : 'Mute'}
                className={`w-6 h-6 flex items-center justify-center rounded ${
                  audioMuted ? 'bg-[#c9b600] text-[#1a0c05]' : 'bg-[#2d1a08] text-[#9a8060] hover:text-[#c9b600]'
                }`}
              >
                {audioMuted ? <VolumeX size={11} /> : <Volume2 size={11} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onAudioRemove(); }}
                className="w-6 h-6 flex items-center justify-center rounded bg-[#2d1a08] text-[#7a4040] hover:text-[#e05050]"
              >
                x
              </button>
            </div>
          ) : null
        }
      >
        <div className="relative w-full h-full bg-[#1a0f04] rounded overflow-hidden">
          {audioTrackContent}
          <div
            className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-l z-10"
            style={{ left: 0, width: timeToPercent(trimStart) }}
          />
          <div
            className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-r z-10"
            style={{ left: timeToPercent(trimEnd), right: 0 }}
          />
          <Playhead left={timeToPercent(currentTime)} />
        </div>
      </TrackRow>

      <TrackRow label="Subs" contentWidth={timelineWidth}>
        <div className="relative w-full h-full bg-[#1a0f04] rounded overflow-hidden">
          <div
            className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-l z-10"
            style={{ left: 0, width: timeToPercent(trimStart) }}
          />
          <div
            className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-r z-10"
            style={{ left: timeToPercent(trimEnd), right: 0 }}
          />
          {subtitles.map((chunk) => {
            const left = `${(chunk.startTime / dur) * 100}%`;
            const width = `${((chunk.endTime - chunk.startTime) / dur) * 100}%`;
            const isActive = currentTime >= chunk.startTime && currentTime <= chunk.endTime;
            return (
              <div
                key={chunk.id}
                title={chunk.text}
                className={`absolute inset-y-1 z-20 rounded ${isActive ? 'bg-[#c9b600]' : 'bg-[#8b8c20]'}`}
                style={{ left, width: `max(4px, ${width})` }}
              />
            );
          })}
          <Playhead left={timeToPercent(currentTime)} />
        </div>
      </TrackRow>

      <TimelineLayerOrder
        layers={layers}
        currentTime={currentTime}
        duration={Math.max(0.001, dur)}
        trimStart={trimStart}
        trimEnd={trimEnd}
        selectedLayerId={selectedLayerId}
        timeToPercent={timeToPercent}
        onLayerOrderChange={onLayerOrderChange}
        onLayerMouseDown={onLayerMouseDown}
      />
    </>
  );
}
