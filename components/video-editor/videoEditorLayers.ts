import { createDefaultLayer } from './videoEditorDefaults';
import { EditorState, Layer, LayerType } from '@/types/editor';

export function useLayerControllers(
  state: EditorState,
  setState: (patch: Partial<EditorState>) => void
) {
  const set = (patch: Partial<EditorState>) => setState(patch);

  function handleAddLayer(type: LayerType) {
    const newLayer = createDefaultLayer(type, state.layers.length);
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  function handleAddLayerAtCoords(type: Exclude<LayerType, 'audio'>, x: number, y: number) {
    const newLayer = createDefaultLayer(type, state.layers.length, x, y);
    set({
      layers: [...state.layers, newLayer],
      selectedLayerId: newLayer.id,
    });
  }

  function handleUpdateLayer(updated: Layer) {
    set({
      layers: state.layers.map((l) => (l.id === updated.id ? updated : l)),
    });
  }

  function handleDeleteLayer(id: string) {
    set({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    });
  }

  function handleSelectLayer(id: string | null) {
    set({ selectedLayerId: id });
  }

  function handleLayerTimingChange(id: string, startTime: number, endTime: number) {
    set({
      layers: state.layers.map((layer) => (layer.id === id ? { ...layer, startTime, endTime } : layer)),
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

  return {
    handleAddLayer,
    handleAddLayerAtCoords,
    handleUpdateLayer,
    handleDeleteLayer,
    handleSelectLayer,
    handleLayerTimingChange,
    handleLayerOrderChange,
  };
}
