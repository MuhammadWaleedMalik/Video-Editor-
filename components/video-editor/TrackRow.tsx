import { ReactNode } from 'react';

interface TrackRowProps {
  label: string;
  children: ReactNode;
  controls?: ReactNode;
  contentWidth?: number;
  heightClassName?: string;
}

export default function TrackRow({
  label,
  children,
  controls,
  contentWidth,
  heightClassName = 'h-7',
}: TrackRowProps) {
  return (
    <div className="mb-1.5 flex items-start gap-2">
      <span className="w-9 shrink-0 pt-2 text-right text-[9px] font-bold uppercase text-[#4a3510] lg:w-10">
        {label}
      </span>
      <div className={`min-w-0 flex-1 relative ${heightClassName}`}>
        {children}
      </div>
      {controls ? <div className="shrink-0">{controls}</div> : <div className="w-8 sm:w-[52px] shrink-0" />}
    </div>
  );
}
