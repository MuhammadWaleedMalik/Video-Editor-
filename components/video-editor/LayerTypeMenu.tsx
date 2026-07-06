import { Layers, Plus, Image as ImageIcon, Film, Type, Music, Captions } from 'lucide-react';
import { LayerType } from '@/types/editor';

export type ObjectType = LayerType | 'subtitle';

interface ObjectTypeMeta {
  type: ObjectType;
  title: string;
  icon: typeof ImageIcon;
}

export const OBJECT_TYPES: ObjectTypeMeta[] = [
  { type: 'image', title: 'Img', icon: ImageIcon },
  { type: 'video', title: 'Vid', icon: Film },
  { type: 'text', title: 'Txt', icon: Type },
  { type: 'audio', title: 'Aud', icon: Music },
  { type: 'subtitle', title: 'Sub', icon: Captions },
];

interface LayerTypeMenuProps {
  activeType: ObjectType;
  onChange: (type: ObjectType) => void;
}

export default function LayerTypeMenu({ activeType, onChange }: LayerTypeMenuProps) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {OBJECT_TYPES.map((entry) => {
        const MetaIcon = entry.icon;
        const isActive = activeType === entry.type;
        return (
          <button
            key={entry.type}
            type="button"
            onClick={() => onChange(entry.type)}
            aria-pressed={isActive}
            aria-label={`Show ${entry.title}`}
            className={`rounded-md p-2 border text-[10px] transition-colors ${
              isActive
                ? 'bg-[#2d1a08] border-[#c9b600] text-[#c9b600]'
                : 'bg-[#241508] border-[#3d2510] text-[#c8b88a] hover:border-[#5a4530]'
            }`}
          >
            <MetaIcon size={14} className="mx-auto mb-1" />
            <span className="block text-center leading-tight">{entry.title}</span>
          </button>
        );
      })}
    </div>
  );
}
