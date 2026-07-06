export interface DragTarget {
  target: 'playhead' | 'trim-start' | 'trim-end';
}

export type LayerDragMode = 'move' | 'start' | 'end';

export interface TimelineDragState {
  id: string;
  mode: LayerDragMode;
  startClientX: number;
  originalStart: number;
  originalEnd: number;
}

export function formatTick(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawWaveform(
  canvas: HTMLCanvasElement,
  waveform: Float32Array,
  currentTime: number,
  duration: number,
  muted: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const centerY = height / 2;
  const barCount = Math.min(waveform.length, width);
  const barW = width / barCount;
  const playedRatio = duration > 0 ? currentTime / duration : 0;
  const playedX = playedRatio * width;

  for (let i = 0; i < barCount; i++) {
    const idx = Math.floor((i / barCount) * waveform.length);
    const amp = waveform[idx];
    const bh = Math.max(2, amp * height * 0.88);
    const x = i * barW;
    const played = x <= playedX;
    ctx.fillStyle = muted
      ? 'rgba(107,112,32,0.25)'
      : played
        ? 'rgba(107,112,32,0.95)'
        : 'rgba(107,112,32,0.45)';
    ctx.fillRect(x, centerY - bh / 2, Math.max(1, barW - 0.8), bh);
  }

  ctx.fillStyle = '#c9b600';
  ctx.fillRect(playedX - 0.5, 0, 1, height);
}
