import { formatTick } from './timelineUtils';

interface TimelineTickStripProps {
  duration: number;
  timeToPercent: (time: number) => string;
  timelineWidth: number;
  labelsEvery?: number;
}

export default function TimelineTickStrip({
  duration,
  timeToPercent,
  timelineWidth,
  labelsEvery = 10,
}: TimelineTickStripProps) {
  const ticks = Array.from({ length: labelsEvery + 1 }, (_, i) => (duration / labelsEvery) * i);

  return (
    <div className="relative h-5 mb-1.5" style={{ minWidth: `${timelineWidth}px` }}>
      {ticks.map((tick) => (
        <span
          key={tick}
          className="absolute text-[#4a3510] text-[9px] font-mono -translate-x-1/2"
          style={{ left: timeToPercent(tick) }}
        >
          {formatTick(tick)}
        </span>
      ))}
    </div>
  );
}
