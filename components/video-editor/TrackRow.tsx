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
    <div className="mb-2 flex items-start gap-3">
      <span className="sticky left-0 z-[70] w-12 shrink-0 bg-[#18120a] pr-1 pt-3 text-right text-[10px] font-bold uppercase text-[#7d5b1d] lg:w-14">
        {label}
      </span>
      <div className={`min-w-0 flex-1 relative ${heightClassName}`}>
        {children}
      </div>
      {controls ? <div className="shrink-0">{controls}</div> : <div className="w-10 shrink-0 sm:w-16" />}
    </div>
  );
}
