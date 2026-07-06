'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearEditorDraft, EditorDraftPayload, loadEditorDraft } from '@/lib/editorDraft';
import { FORMAT_RATIO, formatTime } from '@/components/video-editor/videoCanvas';
import PreviewCanvas from '@/components/video-editor/PreviewCanvas';

export default function ImportedVideoPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<EditorDraftPayload | null>(null);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const trimStart = draft?.trimStart ?? 0;
  const trimEnd = draft?.trimEnd || draft?.duration || 0;
  const activeSub = useMemo(
    () => draft?.subtitles.find((chunk) => currentTime >= chunk.startTime && currentTime <= chunk.endTime) ?? null,
    [currentTime, draft]
  );

  useEffect(() => {
    const nextDraft = loadEditorDraft();
    setDraft(nextDraft);
    setCurrentTime(nextDraft?.trimStart ?? 0);
  }, []);

  useEffect(() => {
    if (!videoRef || !draft) return;
    videoRef.currentTime = trimStart;
    videoRef.muted = draft.audioMuted;
  }, [draft, trimStart, videoRef]);

  function togglePlay() {
    if (!videoRef) return;
    if (playing) {
      videoRef.pause();
      setPlaying(false);
      return;
    }
    if (videoRef.currentTime < trimStart || videoRef.currentTime >= trimEnd) {
      videoRef.currentTime = trimStart;
    }
    void videoRef.play();
    setPlaying(true);
  }

  function handleTimeUpdate() {
    if (!videoRef) return;
    if (trimEnd && videoRef.currentTime >= trimEnd) {
      videoRef.pause();
      videoRef.currentTime = trimEnd;
      setPlaying(false);
    }
    setCurrentTime(videoRef.currentTime);
  }

  function deleteVideo() {
    clearEditorDraft();
    setDraft(null);
    setVideoRef(null);
    setPlaying(false);
  }

  if (!draft?.videoUrl) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#1a0c05] p-6 text-center">
        <div className="max-w-sm rounded-xl border border-[#3d2510] bg-[#120a02] p-6">
          <p className="text-sm font-semibold text-[#e8d5a0]">No imported video found.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-lg bg-[#c9b600] px-4 py-2 text-sm font-semibold text-[#1a0c05]"
          >
            Back to editor
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#1a0c05] text-[#c8b88a]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#3d2510] bg-[#120a02] px-4 py-3">
        <div>
          <h1 className="text-sm font-bold text-[#e8d5a0]">{draft.title}</h1>
          <p className="text-[11px] text-[#7a6040]">
            Trimmed {formatTime(trimStart)} - {formatTime(trimEnd)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 rounded-lg border border-[#3d2510] px-3 py-2 text-xs font-semibold hover:border-[#c9b600]"
          >
            <ArrowLeft size={14} />
            Edit
          </button>
          <a
            href={draft.videoUrl}
            download={draft.videoFileName ?? 'edited-video.webm'}
            className="flex items-center gap-2 rounded-lg bg-[#c9b600] px-3 py-2 text-xs font-semibold text-[#1a0c05] hover:bg-[#e0cc00]"
          >
            <Download size={14} />
            Download
          </a>
          <button
            onClick={deleteVideo}
            className="flex items-center gap-2 rounded-lg border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/40"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 items-center justify-center p-4">
        <div
          className="relative w-full max-w-5xl overflow-hidden rounded-xl bg-black shadow-2xl"
          style={{ aspectRatio: FORMAT_RATIO[draft.format], maxHeight: 'calc(100vh - 130px)' }}
        >
          <PreviewCanvas
            format={draft.format}
            currentTime={currentTime}
            videoUrl={draft.videoUrl}
            muted={draft.audioMuted}
            activeSub={activeSub}
            subtitleFontFamily={draft.subtitleFontFamily}
            subtitleFontScale={draft.subtitleFontScale}
            layers={draft.layers}
            onRefReady={setVideoRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setPlaying(false)}
            onClick={togglePlay}
          />
        </div>
      </section>
    </main>
  );
}
