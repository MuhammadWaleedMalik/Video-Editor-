import { ReactNode } from 'react';

interface TrackRowProps {
  label: string;
  children: ReactNode;
  controls?: ReactNode;
  contentWidth?: number;
}

export default function TrackRow({
  label,
  children,
  controls,
  contentWidth,
}: TrackRowProps) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-9 lg:w-10 text-[9px] text-[#4a3510] font-bold uppercase shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-7 relative" style={{ minWidth: `${contentWidth || 0}px` }}>
        {children}
      </div>
      {controls ? <div className="shrink-0">{controls}</div> : <div className="w-8 sm:w-[52px] shrink-0" />}
    </div>
  );
}
