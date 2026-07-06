import { ArrowDown, ArrowUp, Film, Image as ImageIcon, Music, Type } from 'lucide-react';
import { Layer } from '@/types/editor';
import Playhead from './Playhead';

interface TimelineLayerOrderProps {
  layers: Layer[];
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  selectedLayerId: string | null;
  timeToPercent: (time: number) => string;
  onLayerOrderChange: (id: string, direction: 'front' | 'back') => void;
  onLayerMouseDown: (
    e: React.MouseEvent,
    layer: Layer,
    mode: 'move' | 'start' | 'end'
  ) => void;
}

interface ItemActionProps {
  canMoveForward: boolean;
  canMoveBackward: boolean;
  onMove: (direction: 'front' | 'back') => void;
}

function LayerTypeIcon({ type }: { type: Layer['type'] }) {
  const Icon = type === 'image'
    ? ImageIcon
    : type === 'video'
      ? Film
      : type === 'audio'
        ? Music
        : Type;
  return <Icon size={14} />;
}

function OrderItemActions({
  canMoveForward,
  canMoveBackward,
  onMove,
}: ItemActionProps) {
  return (
    <div className="absolute right-7 top-[1px] h-full flex items-center gap-1 px-1">
      <button
        type="button"
        disabled={!canMoveForward}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          if (!canMoveForward) return;
          e.stopPropagation();
          onMove('front');
        }}
        className={`w-6 h-6 rounded bg-[#2d1a08] border border-[#7b7d20] text-[#9a8060] ${
          canMoveForward ? 'hover:text-[#c9b600]' : 'opacity-30 cursor-not-allowed'
        }`}
        title="Move one step toward front"
      >
        <ArrowUp size={12} />
      </button>
      <button
        type="button"
        disabled={!canMoveBackward}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          if (!canMoveBackward) return;
          e.stopPropagation();
          onMove('back');
        }}
        className={`w-6 h-6 rounded bg-[#2d1a08] border border-[#7b7d20] text-[#9a8060] ${
          canMoveBackward ? 'hover:text-[#c9b600]' : 'opacity-30 cursor-not-allowed'
        }`}
        title="Move one step toward back"
      >
        <ArrowDown size={12} />
      </button>
    </div>
  );
}

export default function TimelineLayerOrder({
  layers,
  currentTime,
  duration,
  trimStart,
  trimEnd,
  selectedLayerId,
  timeToPercent,
  onLayerOrderChange,
  onLayerMouseDown,
}: TimelineLayerOrderProps) {
  const ordered = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex items-start gap-3 mt-2">
      <span className="w-14 pt-2 text-[11px] text-[#4a3510] font-bold uppercase">Layer order</span>
      <div className="flex-1 max-h-[170px] overflow-auto pr-2">
        <div className="text-[10px] text-[#5a4530] mb-2 pl-0.5">Top row is in front.</div>
      {ordered.length === 0 ? (
          <div className="h-9 rounded bg-[#1a0f04] border border-dashed border-[#3d2510] flex items-center justify-center">
            <span className="text-[#3d2510] text-[10px]">Add a layer to place it on the timeline</span>
          </div>
        ) : (
          ordered.map((layer, orderIndex, stack) => {
            const left = `${(layer.startTime / Math.max(0.001, duration)) * 100}%`;
            const width = `${Math.max(0.5, ((layer.endTime - layer.startTime) / Math.max(0.001, duration)) * 100)}%`;
            const selected = selectedLayerId === layer.id;
            const canMoveForward = orderIndex > 0;
            const canMoveBackward = orderIndex < stack.length - 1;

            return (
              <div
                key={layer.id}
                className="relative h-10 mb-2 rounded bg-[#1a0f04] overflow-hidden"
                title={`Layer position: ${ordered.length - orderIndex} (top = front)`}
              >
                <div
                  className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-l z-10"
                  style={{ left: 0, width: timeToPercent(trimStart) }}
                />
                <div
                  className="absolute inset-y-0 bg-[#0e0702] opacity-70 rounded-r z-10"
                  style={{ left: timeToPercent(trimEnd), right: 0 }}
                />
                <Playhead left={timeToPercent(currentTime)} />
                <div
                  className={`absolute inset-y-1 rounded border ${
                    selected
                      ? 'bg-[#c9b600] border-[#f0dd2a] text-[#1a0c05]'
                      : 'bg-[#3b360d] border-[#7b7d20] text-[#e8d5a0] hover:border-[#c9b600]'
                  }`}
                  style={{ left, width: `max(28px, ${width})`, zIndex: 20 }}
                  onMouseDown={(e) => onLayerMouseDown(e, layer, 'move')}
                >
                  <div
                    className="absolute left-0 top-0 h-full w-2.5 cursor-ew-resize bg-black/20"
                    onMouseDown={(e) => onLayerMouseDown(e, layer, 'start')}
                  />
                  <div className="flex h-full items-center gap-1.5 px-2 min-w-0">
                    <LayerTypeIcon type={layer.type} />
                    <span className="text-[12px] font-semibold truncate">{layer.name}</span>
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-2.5 cursor-ew-resize bg-black/20"
                    onMouseDown={(e) => onLayerMouseDown(e, layer, 'end')}
                  />
                </div>
                  <OrderItemActions
                    canMoveForward={canMoveForward}
                    canMoveBackward={canMoveBackward}
                    onMove={(direction) => onLayerOrderChange(layer.id, direction)}
                  />
              </div>
            );
          })
        )}
      </div>
      <div className="w-[52px] shrink-0" />
    </div>
  );
}
