import { VideoFormat } from '@/types/editor';

export const FORMAT_RATIO: Record<VideoFormat, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
};

export function formatTime(s: number): string {
  const safeSeconds = Math.max(0, s);
  const h = Math.floor(safeSeconds / 3600);
  const m = Math.floor((safeSeconds % 3600) / 60);
  const sec = Math.floor(safeSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function getActiveSub(subtitles: Array<{ startTime: number; endTime: number; text: string }>, t: number) {
  return subtitles.find((c) => t >= c.startTime && t <= c.endTime) ?? null;
}

export function getCanvasSize(
  videoWidth: number,
  videoHeight: number,
  format: VideoFormat,
  containerWidth?: number,
  containerHeight?: number
) {
  const targetRatio = FORMAT_RATIO[format];
  const vw = Math.max(1, Math.round(videoWidth || 1280));
  const vh = Math.max(1, Math.round(videoHeight || 720));

  if (!containerWidth || !containerHeight) {
    const videoRatio = vw / vh;
    if (targetRatio <= videoRatio) {
      return { width: vw, height: Math.max(1, Math.round(vw / targetRatio)) };
    }
    return { width: Math.max(1, Math.round(vh * targetRatio)), height: vh };
  }

  const containerRatio = containerWidth / containerHeight;
  if (containerRatio > targetRatio) {
    const width = Math.floor(Math.max(1, containerHeight) * targetRatio);
    return { width: Math.max(1, width), height: Math.max(1, Math.floor(containerHeight)) };
  }

  return {
    width: Math.max(1, Math.floor(containerWidth)),
    height: Math.max(1, Math.floor(containerWidth / targetRatio)),
  };
}

export function drawVideoFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;

  const videoRatio = vw / vh;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);

  const fitScale = Math.min(cw / vw, ch / vh);
  const dw = Math.max(1, Math.floor(vw * fitScale));
  const dh = Math.max(1, Math.floor(vh * fitScale));

  ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  const flushWord = (value: string) => {
    if (!value) return;
    const test = current ? `${current} ${value}` : value;
    if (ctx.measureText(test).width <= maxW) {
      current = test;
      return;
    }
    if (current) lines.push(current);
    current = value;
    if (ctx.measureText(current).width <= maxW) return;

    let start = 0;
    while (start < value.length) {
      let end = value.length;
      while (end > start) {
        const piece = value.slice(start, end);
        if (ctx.measureText(piece).width <= maxW || end - start <= 1) {
          lines.push(piece);
          start = end;
          break;
        }
        end -= 1;
      }
    }
    current = '';
  }

  for (const w of words) {
    const clean = w.trim();
    if (!clean) continue;
    flushWord(clean);
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export interface SubtitleStyle {
  fontFamily: string;
  scalePercent: number;
}

export function drawSubtitleOverlay(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: SubtitleStyle
) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const normalizedScale = Math.min(180, Math.max(40, Number.isFinite(style.scalePercent) ? style.scalePercent : 100));
  const horizontalInset = cw * 0.06;
  const maxLineWidth = Math.max(120, cw - horizontalInset * 2);
  const baseFontSize = Math.max(12, Math.min(36, Math.round(Math.min(cw, ch) * 0.06)));
  let fs = Math.max(12, Math.round((baseFontSize * normalizedScale) / 100));
  ctx.font = `bold ${fs}px ${style.fontFamily}`;

  const maxRelativeHeight = ch * 0.35;
  const minFont = 12;
  const maxFont = 72;
  let lines = wrapText(ctx, text, maxLineWidth);
  let lineH = fs * 1.32;
  let boxH = lineH * lines.length + fs * 0.6;

  let guard = 0;
  while (
    guard < 100 &&
    fs > minFont &&
    (boxH > maxRelativeHeight || lines.some((line) => ctx.measureText(line).width > maxLineWidth))
  ) {
    fs = Math.max(minFont, fs - 1);
    ctx.font = `bold ${fs}px ${style.fontFamily}`;
    lines = wrapText(ctx, text, maxLineWidth);
    lineH = fs * 1.32;
    boxH = lineH * lines.length + fs * 0.6;
    guard += 1;
  }

  fs = Math.min(maxFont, Math.max(minFont, fs));
  ctx.font = `bold ${fs}px ${style.fontFamily}`;

  if (lines.length > 8) {
    fs = Math.max(minFont, fs - (lines.length - 8));
    ctx.font = `bold ${fs}px ${style.fontFamily}`;
    lines = wrapText(ctx, text, maxLineWidth);
    lineH = fs * 1.32;
    boxH = lineH * lines.length + fs * 0.6;
  }

  const boxY = Math.max(ch * 0.05, ch - boxH - ch * 0.04);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  roundRect(ctx, cw * 0.03, boxY - fs * 0.2, cw * 0.94, boxH, fs * 0.4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  lines.forEach((line, i) => {
    ctx.fillText(line, cw / 2, boxY + fs * 0.35 + i * lineH + lineH / 2);
  });
  ctx.restore();
}
