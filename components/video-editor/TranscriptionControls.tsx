import { Loader2, Pause, Play, Square, Wand2 } from 'lucide-react';

interface TranscriptionControlsProps {
  isTranscribing: boolean;
  status: string;
  onAutoTranscribe: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export default function TranscriptionControls({
  isTranscribing,
  status,
  onAutoTranscribe,
  onPause,
  onResume,
  onCancel,
}: TranscriptionControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onAutoTranscribe}
        disabled={isTranscribing}
        className={`w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg transition-colors ${
          isTranscribing
            ? 'bg-[#2d1a08] border border-[#4a3010] text-[#9a8060] cursor-not-allowed'
            : 'bg-[#1f1005] border border-[#3d2510] hover:border-[#7a6040] text-[#7a6040] hover:text-[#c8b88a]'
        }`}
      >
        {isTranscribing ? <Loader2 size={12} className="animate-spin text-[#c9b600]" /> : <Wand2 size={12} />}
        {isTranscribing ? 'Transcribing...' : 'Auto Transcribe'}
      </button>

      {isTranscribing ? (
        <div className="grid grid-cols-3 gap-1">
          <button onClick={onPause} className="rounded bg-[#1f1005] border border-[#3d2510] py-1.5 text-[#9a8060] hover:text-[#c9b600]">
            <Pause size={12} className="mx-auto" />
          </button>
          <button onClick={onResume} className="rounded bg-[#1f1005] border border-[#3d2510] py-1.5 text-[#9a8060] hover:text-[#c9b600]">
            <Play size={12} className="mx-auto" />
          </button>
          <button onClick={onCancel} className="rounded bg-[#1f1005] border border-red-900/50 py-1.5 text-red-300 hover:bg-red-950/40">
            <Square size={12} className="mx-auto" />
          </button>
        </div>
      ) : null}

      {!!status && <p className="text-[10px] text-[#9a8060]">{status}</p>}
    </div>
  );
}

