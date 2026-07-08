import { Loader2, Pause, Play, Square, Wand2 } from 'lucide-react';
import { useState } from 'react';

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
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirm() {
    setConfirmOpen(false);
    onAutoTranscribe();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setConfirmOpen(true)}
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

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#4a3010] bg-[#120a02] p-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#f2d40b]">
              <Wand2 size={15} />
              <h3 className="text-sm font-bold">Auto Transcribe Edited Video?</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#c8b88a]">
              Have you completed the editing? If yes, we will render the full edited canvas as one video,
              use its main timeline audio, and add the generated text into subtitles.
            </p>
            <p className="mt-2 rounded-lg border border-[#3d2510] bg-[#1f1005] p-2 text-[10px] leading-relaxed text-[#9a8060]">
              This will not transcribe every uploaded video. It only transcribes the final edited timeline output.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-[#3d2510] px-3 py-2 text-xs font-semibold text-[#9a8060] hover:border-[#7a6040] hover:text-[#c8b88a]"
              >
                Not Yet
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-[#c9b600] px-3 py-2 text-xs font-bold text-[#1a0c05] hover:bg-[#e0cc00]"
              >
                Yes, Transcribe
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
