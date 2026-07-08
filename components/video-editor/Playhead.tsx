interface PlayheadProps {
  left: string;
  onPointerDown?: (e: React.PointerEvent) => void;
}

export default function Playhead({ left, onPointerDown }: PlayheadProps) {
  return (
    <div
      className={`absolute inset-y-0 z-50 flex w-4 -translate-x-1/2 touch-none justify-center ${
        onPointerDown ? 'cursor-ew-resize' : 'pointer-events-none'
      }`}
      style={{ left }}
      onPointerDown={onPointerDown}
    >
      <div className="h-full w-px bg-[#c9b600]" />
      <div className="absolute top-0 h-3 w-3 rounded-full bg-[#c9b600] shadow-[0_0_10px_rgba(201,182,0,0.55)]" />
    </div>
  );
}
