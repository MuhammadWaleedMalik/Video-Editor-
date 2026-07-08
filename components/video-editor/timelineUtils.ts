function pad(value: number, size = 2) {
  return String(Math.floor(value)).padStart(size, '0');
}

function trimTrailingZeros(value: string) {
  return value.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

export function formatTick(seconds: number) {
  const safeSeconds = Math.max(0, seconds);

  if (safeSeconds < 1) {
    return `${Math.round(safeSeconds * 1000)}ms`;
  }

  if (safeSeconds < 60) {
    const precise = safeSeconds < 10 ? safeSeconds.toFixed(1) : String(Math.round(safeSeconds));
    return `${trimTrailingZeros(precise)}s`;
  }

  if (safeSeconds < 3600) {
    const m = Math.floor(safeSeconds / 60);
    const s = Math.floor(safeSeconds % 60);
    return `${m}:${pad(s)}`;
  }

  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const s = Math.floor(safeSeconds % 60);
  return `${h}:${pad(m)}:${pad(s)}`;
}

export function getTimelineTickStep(duration: number) {
  if (duration <= 1) return 0.1;
  if (duration <= 10) return 1;
  if (duration <= 60) return 5;
  if (duration <= 600) return 10;
  if (duration <= 3600) return 60;
  return 300;
}

export function getTimelineMinorTickStep(duration: number, majorStep = getTimelineTickStep(duration)) {
  if (duration <= 10) return 0.1;
  if (duration <= 60) return 1;
  if (duration <= 600) return 5;
  if (duration <= 3600) return 30;
  return Math.max(60, majorStep / 5);
}

export function getTimelineTicks(duration: number, step = getTimelineTickStep(duration)) {
  const safeDuration = Math.max(0, duration);
  const safeStep = Math.max(0.001, step);
  const ticks: number[] = [];
  const epsilon = safeStep / 100;

  for (let tick = 0; tick < safeDuration; tick += safeStep) {
    const rounded = Math.round(tick * 1000) / 1000;
    if (ticks.length === 0 || rounded - ticks[ticks.length - 1] > epsilon) {
      ticks.push(rounded);
    }
  }

  if (ticks.length === 0 || Math.abs(ticks[ticks.length - 1] - safeDuration) > epsilon) {
    ticks.push(safeDuration);
  }

  return ticks;
}
