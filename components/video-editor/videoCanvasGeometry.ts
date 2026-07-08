import { CanvasObject, Layer } from '@/types/editor';
import { LayerDragAction, LayerDragState } from './videoCanvasController';

interface DragDelta {
  deltaX: number;
  deltaY: number;
}

const MIN_OBJECT_SIZE = 2;
const MAX_OBJECT_SIZE = 100;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampSize(value: number) {
  return clamp(value, MIN_OBJECT_SIZE, MAX_OBJECT_SIZE);
}

function clampRectToCanvas(x: number, y: number, width: number, height: number) {
  const safeWidth = clampSize(width);
  const safeHeight = clampSize(height);

  return {
    x: clamp(x, 0, 100 - safeWidth),
    y: clamp(y, 0, 100 - safeHeight),
    width: safeWidth,
    height: safeHeight,
  };
}

export function calcDragDelta(
  event: MouseEvent | PointerEvent,
  state: LayerDragState
): DragDelta {
  return {
    deltaX: ((event.clientX - state.startMouseX) / state.containerW) * 100,
    deltaY: ((event.clientY - state.startMouseY) / state.containerH) * 100,
  };
}

export function buildDraggedLayerRect(
  _layer: Pick<Layer | CanvasObject, 'x' | 'y' | 'width' | 'height'>,
  action: LayerDragAction,
  state: LayerDragState,
  deltaX: number,
  deltaY: number
): { x: number; y: number; width: number; height: number } {
  const { startX, startY, startW, startH } = state;
  if (action === 'move') {
    return clampRectToCanvas(startX + deltaX, startY + deltaY, startW, startH);
  }

  let x = startX;
  let y = startY;
  let width = startW;
  let height = startH;
  const right = startX + startW;
  const bottom = startY + startH;

  if (action === 'resize-br') {
    width = clampSize(startW + deltaX);
    height = clampSize(startH + deltaY);
  } else if (action === 'resize-bl') {
    width = clampSize(startW - deltaX);
    x = right - width;
    height = clampSize(startH + deltaY);
  } else if (action === 'resize-tr') {
    width = clampSize(startW + deltaX);
    height = clampSize(startH - deltaY);
    y = bottom - height;
  } else {
    width = clampSize(startW - deltaX);
    height = clampSize(startH - deltaY);
    x = right - width;
    y = bottom - height;
  }

  return clampRectToCanvas(x, y, width, height);
}
