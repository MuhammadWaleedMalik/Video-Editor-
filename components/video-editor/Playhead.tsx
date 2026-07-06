interface PlayheadProps {
  left: string;
}

export default function Playhead({ left }: PlayheadProps) {
  return (
    <div
      className="absolute inset-y-0 w-px bg-[#c9b600] z-40 pointer-events-none"
      style={{ left }}
    >
      <div className="w-2 h-2 bg-[#c9b600] rounded-full -translate-x-[3px]" />
    </div>
  );
}
