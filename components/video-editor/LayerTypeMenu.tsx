import { Image as ImageIcon, Film, Type, Music } from 'lucide-react';
import { LayerType } from '@/types/editor';

export type ObjectType = LayerType;

interface ObjectTypeMeta {
  type: ObjectType;
  title: string;
  icon: typeof ImageIcon;
}

export const OBJECT_TYPES: ObjectTypeMeta[] = [
  { type: 'video', title: 'Video', icon: Film },
  { type: 'image', title: 'Image', icon: ImageIcon },
  { type: 'text', title: 'Text', icon: Type },
  { type: 'audio', title: 'Audio', icon: Music },
];

interface LayerTypeMenuProps {
  activeType: ObjectType;
  onChange: (type: ObjectType) => void;
}

export default function LayerTypeMenu({ activeType, onChange }: LayerTypeMenuProps) {
  return (
    <div className="grid grid-cols-4 gap-1">
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
            className={`min-h-14 rounded-md border p-2 text-[10px] transition-colors ${
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
