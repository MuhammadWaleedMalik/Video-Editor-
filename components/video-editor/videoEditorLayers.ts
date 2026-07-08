import { createDefaultLayer } from './videoEditorDefaults';
import { EditorState, Layer, LayerType } from '@/types/editor';
import { calculateLayerTimelineDuration, calculateTimelineDuration, clampPlayhead, reorderTimelineStack } from './timelineModel';

export function useLayerControllers(
  state: EditorState,
  setState: (patch: Partial<EditorState>) => void
) {
  const set = (patch: Partial<EditorState>) => setState(patch);

  function projectDuration(nextLayers: Layer[]) {
    return Math.max(
      calculateTimelineDuration(state.timelineClips),
      calculateLayerTimelineDuration(nextLayers)
    );
  }

  function handleAddLayer(type: LayerType) {
    const newLayer = createDefaultLayer(type, state.layers.length);
    const nextLayers = [...state.layers, newLayer];
    const duration = projectDuration(nextLayers);
    set({
      layers: nextLayers,
      selectedLayerId: newLayer.id,
      duration,
      currentTime: clampPlayhead(state.currentTime, duration),
    });
  }

  function handleAddLayerAtCoords(type: Exclude<LayerType, 'audio'>, x: number, y: number) {
    const newLayer = createDefaultLayer(type, state.layers.length, x, y);
    const nextLayers = [...state.layers, newLayer];
    const duration = projectDuration(nextLayers);
    set({
      layers: nextLayers,
      selectedLayerId: newLayer.id,
      duration,
      currentTime: clampPlayhead(state.currentTime, duration),
    });
  }

  function handleUpdateLayer(updated: Layer) {
    const nextLayers = state.layers.map((l) => (l.id === updated.id ? updated : l));
    const duration = projectDuration(nextLayers);
    set({
      layers: nextLayers,
      duration,
      currentTime: clampPlayhead(state.currentTime, duration),
    });
  }

  function handleDeleteLayer(id: string) {
    const nextLayers = state.layers.filter((l) => l.id !== id);
    const duration = projectDuration(nextLayers);
    set({
      layers: nextLayers,
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
      duration,
      currentTime: clampPlayhead(state.currentTime, duration),
    });
  }

  function handleSelectLayer(id: string | null) {
    set({ selectedLayerId: id });
  }

  function handleLayerTimingChange(id: string, startTime: number, endTime: number) {
    const nextLayers = state.layers.map((layer) => (layer.id === id ? { ...layer, startTime, endTime } : layer));
    const duration = projectDuration(nextLayers);
    set({
      layers: nextLayers,
      duration,
      currentTime: clampPlayhead(state.currentTime, duration),
    });
  }

  function handleLayerOrderChange(id: string, direction: 'front' | 'back') {
    const orderedByDepth = [...state.layers].sort((a, b) => b.zIndex - a.zIndex);
    const idx = orderedByDepth.findIndex((item) => item.id === id);
    if (idx === -1) return;

    const next = [...orderedByDepth];
    if (direction === 'front' && idx > 0) {
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    } else if (direction === 'back' && idx < next.length - 1) {
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    } else return;

    const maxOrder = next.length;
    const zIndexById = new Map(next.map((layer, order) => [layer.id, maxOrder - order] as const));
    set({
      layers: state.layers.map((layer) => {
        const nextZ = zIndexById.get(layer.id);
        return nextZ ? { ...layer, zIndex: nextZ } : layer;
      }),
    });
  }

  function handleLayerStackOrderChange(id: string, targetIndex: number) {
    const reordered = reorderTimelineStack(
      'layer',
      id,
      targetIndex,
      state.layers,
      state.timelineClips,
      state.canvasObjects
    );
    if (!reordered) return;

    set({
      layers: reordered.layers,
      canvasObjects: reordered.canvasObjects,
      selectedLayerId: id,
    });
  }

  return {
    handleAddLayer,
    handleAddLayerAtCoords,
    handleUpdateLayer,
    handleDeleteLayer,
    handleSelectLayer,
    handleLayerTimingChange,
    handleLayerOrderChange,
    handleLayerStackOrderChange,
  };
}
