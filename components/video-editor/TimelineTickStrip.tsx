import { memo, useMemo } from 'react';
import { formatTick, getTimelineMinorTickStep, getTimelineTickStep, getTimelineTicks } from './timelineUtils';

interface TimelineTickStripProps {
  duration: number;
  timeToPercent: (time: number) => string;
  timelineWidth: number;
  labelsEvery?: number;
}

const TimelineTickStrip = memo(function TimelineTickStrip({
  duration,
  timeToPercent,
  timelineWidth,
  labelsEvery,
}: TimelineTickStripProps) {
  const majorStep = useMemo(() => Math.max(0.1, labelsEvery ?? getTimelineTickStep(duration)), [duration, labelsEvery]);
  const minorTicks = useMemo(() => {
    const minorStep = getTimelineMinorTickStep(duration, majorStep);
    return getTimelineTicks(duration, minorStep);
  }, [duration, majorStep]);
  const majorTicks = useMemo(() => {
    return getTimelineTicks(duration, majorStep);
  }, [duration, majorStep]);

  return (
    <div
      className="relative h-9 overflow-hidden rounded-md border border-[#4d3910] bg-[#100a04] shadow-[inset_0_1px_0_rgba(242,212,11,0.16)]"
      style={{ minWidth: `${timelineWidth}px` }}
    >
      <div className="absolute left-0 right-0 top-[18px] h-px bg-[#c9b600]/55" />
      {minorTicks.map((tick) => (
        <div
          key={`minor-${tick}`}
          className="absolute top-[18px] h-2 border-l border-[#c9b600]/25"
          style={{ left: timeToPercent(tick) }}
        />
      ))}
      {majorTicks.map((tick, index) => {
        const transform =
          index === 0
            ? 'translateX(4px)'
            : index === majorTicks.length - 1
              ? 'translateX(calc(-100% - 4px))'
              : 'translateX(-50%)';

        return (
          <div
            key={`major-${tick}`}
            className="absolute top-0 h-8 border-l border-[#f2d40b]"
            style={{ left: timeToPercent(tick) }}
          >
            <span
              className="absolute left-0 top-1 whitespace-nowrap rounded bg-[#201306] px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-[#fff0a6] ring-1 ring-[#5d4612]"
              style={{ transform }}
            >
              {formatTick(tick)}
            </span>
          </div>
        );
      })}
    </div>
  );
});

export default TimelineTickStrip;
