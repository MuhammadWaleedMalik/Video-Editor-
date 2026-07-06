import { Layer } from '@/types/editor';
import { LayerDragAction, LayerDragState } from './videoCanvasController';

interface DragDelta {
  deltaX: number;
  deltaY: number;
}

export function calcDragDelta(
  event: MouseEvent,
  state: LayerDragState
): DragDelta {
  return {
    deltaX: ((event.clientX - state.startMouseX) / state.containerW) * 100,
    deltaY: ((event.clientY - state.startMouseY) / state.containerH) * 100,
  };
}

export function buildDraggedLayerRect(
  layer: Layer,
  action: LayerDragAction,
  state: LayerDragState,
  deltaX: number,
  deltaY: number
): { x: number; y: number; width: number; height: number } {
  const { startX, startY, startW, startH } = state;
  if (action === 'move') {
    return {
      x: Math.max(0, Math.min(100 - startW, startX + deltaX)),
      y: Math.max(0, Math.min(100 - startH, startY + deltaY)),
      width: startW,
      height: startH,
    };
  }

  let x = layer.x;
  let y = layer.y;
  let width = layer.width;
  let height = layer.height;

  if (action === 'resize-br') {
    width = Math.max(5, Math.min(100 - startX, startW + deltaX));
    height = Math.max(5, Math.min(100 - startY, startH + deltaY));
  } else if (action === 'resize-bl') {
    const nextW = startW - deltaX;
    if (nextW > 5 && startX + deltaX >= 0) {
      x = startX + deltaX;
      width = nextW;
    }
    height = Math.max(5, Math.min(100 - startY, startH + deltaY));
  } else if (action === 'resize-tr') {
    width = Math.max(5, Math.min(100 - startX, startW + deltaX));
    const nextH = Math.max(5, startH - deltaY);
    const nextY = startY + (startH - nextH);
    if (startH - deltaY > 5 && nextY >= 0) {
      y = nextY;
      height = nextH;
    } else {
      height = startH;
    }
  } else {
    const nextW = startW - deltaX;
    if (nextW > 5 && startX + deltaX >= 0) {
      x = startX + deltaX;
      width = nextW;
    }
    const nextH = startH - deltaY;
    if (nextH > 5 && startY + deltaY >= 0) {
      y = startY + deltaY;
      height = nextH;
    }
  }

  return { x, y, width, height };
}
