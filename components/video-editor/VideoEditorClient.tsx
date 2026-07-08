'use client';

import dynamic from 'next/dynamic';

const VideoEditor = dynamic(() => import('./index'), {
  ssr: false,
  loading: () => (
    <main className="flex h-[100svh] items-center justify-center bg-[#1a0c05] text-[#c8b88a] supports-[height:100dvh]:h-[100dvh]">
      <div className="rounded-xl border border-[#3d2510] bg-[#120a02] px-4 py-3 text-sm font-semibold">
        Loading editor...
      </div>
    </main>
  ),
});

export default function VideoEditorClient() {
  return <VideoEditor />;
}
