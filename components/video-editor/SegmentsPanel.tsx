'use client';

import { Trash2, Plus } from 'lucide-react';
import { TrimSegment } from '@/types/editor';

interface SegmentsPanelProps {
  segments: TrimSegment[];
  duration: number;
  currentTime: number;
  onAddSegment: (startTime: number, endTime: number, trackType: 'video' | 'audio' | 'both') => void;
  onUpdateSegment: (segmentId: string, updates: Partial<TrimSegment>) => void;
  onDeleteSegment: (segmentId: string) => void;
  onSeek: (time: number) => void;
}

export default function SegmentsPanel({
  segments,
  duration,
  currentTime,
  onAddSegment,
  onUpdateSegment,
  onDeleteSegment,
  onSeek,
}: SegmentsPanelProps) {
  const handleAddFromCurrent = () => {
    const start = Math.max(0, currentTime - 2);
    const end = Math.min(duration, currentTime + 2);
    onAddSegment(start, end, 'both');
  };

  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="w-full h-full p-3 flex flex-col overflow-hidden">
      <button
        onClick={handleAddFromCurrent}
        className="w-full flex items-center justify-center gap-2 bg-[#2d1a08] border border-[#3d2510] px-3 py-2 rounded mb-3 text-xs font-semibold text-[#c9b600] hover:border-[#c9b600] transition-colors"
      >
        <Plus size={14} /> Add Keep Range
      </button>

      {/* Segments list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {segments.length === 0 ? (
          <p className="text-xs text-[#5a4530]">No trim segments. Add ranges to keep parts of your video.</p>
        ) : (
          sortedSegments.map((segment) => (
            <div key={segment.id} className="p-2 rounded border border-[#3d2510] hover:border-[#7a6040] transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#c8b88a]">
                    {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s
                  </p>
                  <p className="text-[10px] text-[#5a4530]">
                    {segment.trackType === 'both' && '🎬 Video + Audio'}
                    {segment.trackType === 'video' && '🎬 Video Only'}
                    {segment.trackType === 'audio' && '🔊 Audio Only'}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteSegment(segment.id)}
                  className="text-[#5a4530] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Time inputs */}
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="text-[10px] font-bold text-[#5a4530]">Start</label>
                  <input
                    type="number"
                    step="0.1"
                    value={segment.startTime.toFixed(1)}
                    onChange={(e) => onUpdateSegment(segment.id, { startTime: parseFloat(e.target.value) })}
                    className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-1 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#5a4530]">End</label>
                  <input
                    type="number"
                    step="0.1"
                    value={segment.endTime.toFixed(1)}
                    onChange={(e) => onUpdateSegment(segment.id, { endTime: parseFloat(e.target.value) })}
                    className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-1 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                  />
                </div>
              </div>

              {/* Track type selector */}
              <div className="mt-2">
                <label className="text-[10px] font-bold text-[#5a4530]">Apply to</label>
                <select
                  value={segment.trackType}
                  onChange={(e) => onUpdateSegment(segment.id, { trackType: e.target.value as 'video' | 'audio' | 'both' })}
                  className="w-full text-xs bg-[#1a0c05] border border-[#3d2510] px-1 py-1 rounded text-[#c8b88a] focus:border-[#c9b600] outline-none"
                >
                  <option value="both">Both (Video + Audio)</option>
                  <option value="video">Video Only</option>
                  <option value="audio">Audio Only</option>
                </select>
              </div>

              {/* Seek button */}
              <button
                onClick={() => onSeek(segment.startTime)}
                className="w-full mt-2 text-xs bg-[#2d1a08] border border-[#3d2510] px-2 py-1 rounded text-[#c8b88a] hover:border-[#c9b600] transition-colors"
              >
                Go to Start
              </button>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="border-t border-[#3d2510] pt-2 mt-2 text-[10px] text-[#5a4530]">
        <p>💡 Add segments to define which parts to keep. Undefined parts will be trimmed.</p>
      </div>
    </div>
  );
}
