'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditorHeader from './EditorHeader';
import LeftSidebar from './LeftSidebar';
import VideoPreview from './VideoPreview';
import SubtitlesPanel from './SubtitlesPanel';
import Timeline from './Timeline';
import useVideoEditorController from './editorController';
import { buildEditorDraft, saveEditorDraft } from '@/lib/editorDraft';
import { renderEditedProjectForTranscription } from './renderEditedProject';

export default function VideoEditor() {
  const router = useRouter();
  const editor = useVideoEditorController();
  const hasTimeline = editor.state.timelineClips.length > 0;
  const previewAbortRef = useRef<AbortController | null>(null);
  const [showPreviewConfirm, setShowPreviewConfirm] = useState(false);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [previewStatus, setPreviewStatus] = useState('');
  const [previewError, setPreviewError] = useState('');

  function handleImport() {
    if (!hasTimeline) return;
    saveEditorDraft(buildEditorDraft(editor.state, editor.title));
    router.push('/import');
  }

  async function handleRenderPreview() {
    if (!hasTimeline) {
      setPreviewError('Add at least one item to the timeline before previewing.');
      return;
    }

    setIsRenderingPreview(true);
    setPreviewError('');
    setPreviewStatus('Preparing final preview...');
    editor.set({ isPlaying: false });

    try {
      previewAbortRef.current?.abort();
      const abortController = new AbortController();
      previewAbortRef.current = abortController;
      const file = await renderEditedProjectForTranscription(editor.state, {
        fileName: 'completed-canvas-preview.webm',
        requireAudio: false,
        progressLabel: 'Rendering completed canvas preview',
        signal: abortController.signal,
        onProgress: setPreviewStatus,
      });
      const renderedUrl = URL.createObjectURL(file);
      saveEditorDraft(buildEditorDraft(editor.state, editor.title, {
        currentTime: 0,
        duration: editor.state.duration,
        trimStart: 0,
        trimEnd: editor.state.duration,
        videoFileName: file.name,
        videoUrl: renderedUrl,
        videoSourceHint: 'rendered-preview',
      }));
      router.push('/import');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create preview video.';
      setPreviewError(message);
      setPreviewStatus('');
    } finally {
      previewAbortRef.current = null;
      setIsRenderingPreview(false);
    }
  }

  function handleCancelPreviewConfirm() {
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
    setShowPreviewConfirm(false);
    setIsRenderingPreview(false);
    setPreviewStatus('');
    setPreviewError('');
  }

  return (
    <div className="flex min-h-[100svh] flex-col overflow-x-hidden bg-[#1a0c05] pb-[env(safe-area-inset-bottom)] supports-[min-height:100dvh]:min-h-[100dvh]">
      <EditorHeader
        title={editor.title}
        format={editor.state.format}
        onTitleChange={editor.setTitle}
        onFormatChange={editor.handleFormatChange}
        onPreviewOpen={() => {
          setPreviewError('');
          setPreviewStatus('');
          setShowPreviewConfirm(true);
        }}
        onImport={handleImport}
      />

      <div className="flex-1 overflow-visible overscroll-contain md:min-h-[720px]">
        <div className="flex min-h-full flex-col md:min-h-[720px] md:flex-row">
          <div className="h-[34svh] min-h-[220px] w-full shrink-0 md:h-auto md:max-h-none md:w-72 lg:w-80 xl:w-96">
            <LeftSidebar
              layers={editor.state.layers}
              mediaAssets={editor.state.mediaAssets}
              textAssets={editor.state.textAssets}
              selectedLayerId={editor.state.selectedLayerId}
              onSelectLayer={editor.handleSelectLayer}
              onAddLayer={editor.handleAddLayer}
              onDeleteLayer={editor.handleDeleteLayer}
              onVideoUpload={editor.handleVideoUpload}
              onImageUpload={editor.handleImageUpload}
              onAudioUpload={editor.handleAudioUpload}
              onPlaceAsset={editor.handlePlaceAsset}
              onDeleteAsset={editor.handleDeleteAsset}
              onPlaceTextAsset={editor.handlePlaceTextAsset}
              onDeleteTextAsset={editor.handleDeleteTextAsset}
              isUploadingMedia={editor.state.isUploadingMedia}
              uploadError={editor.state.uploadError}
            />
          </div>

          <div className="flex min-h-[320px] min-w-0 flex-1 sm:min-h-[460px] md:min-h-[720px]">
            <VideoPreview
              videoUrl={editor.state.videoUrl ?? ''}
              isPlaying={editor.state.isPlaying}
              currentTime={editor.state.currentTime}
              trimStart={0}
              trimEnd={editor.state.duration}
              subtitles={editor.state.subtitles}
              format={editor.state.format}
              onPlayPause={editor.handlePlayPause}
              onSeek={editor.handleSeek}
              onTimeUpdate={editor.handleTimeUpdate}
              onDurationChange={editor.handleDurationChange}
              subtitleFontScale={editor.state.subtitleFontScale}
              subtitleFontFamily={editor.state.subtitleFontFamily}
              videoRef={editor.videoRef}
              audioMuted={editor.state.audioMuted}
              playbackRate={editor.state.playbackRate}
              onToggleMute={editor.handleAudioMuteToggle}
              onPlaybackRateChange={editor.handlePlaybackRateChange}
              layers={editor.state.layers}
              mediaAssets={editor.state.mediaAssets}
              timelineClips={editor.state.timelineClips}
              canvasObjects={editor.state.canvasObjects}
              selectedLayerId={editor.state.selectedLayerId}
              selectedClipId={editor.state.selectedClipId}
              selectedCanvasObjectId={editor.state.selectedCanvasObjectId}
              onSelectLayer={editor.handleSelectLayer}
              onSelectClip={editor.handleSelectClip}
              onUpdateLayer={editor.handleUpdateLayer}
              onUpdateCanvasObject={editor.handleUpdateCanvasObject}
              onAddLayerAtCoords={editor.handleAddLayerAtCoords}
            />
          </div>

          <div className="h-[38svh] min-h-[240px] w-full shrink-0 md:h-auto md:max-h-none md:w-72 lg:w-80 xl:w-96">
            <SubtitlesPanel
              subtitles={editor.state.subtitles}
              currentTime={editor.state.currentTime}
              duration={editor.state.duration}
              onSubtitlesChange={editor.handleSubtitlesChange}
              onSeek={editor.handleSeek}
              isTranscribing={editor.isTranscribing}
              transcribeStatus={editor.transcribeStatus}
              onAutoTranscribe={editor.handleAutoTranscribe}
              onTranscribePause={editor.handleTranscribePause}
              onTranscribeResume={editor.handleTranscribeResume}
              onTranscribeCancel={editor.handleTranscribeCancel}
              transcribeLanguage={editor.transcribeLanguage}
              onTranscribeLanguageChange={editor.handleTranscribeLanguageChange}
              subtitleFontScale={editor.state.subtitleFontScale}
              subtitleFontFamily={editor.state.subtitleFontFamily}
              onSubtitleFontScaleChange={editor.handleSubtitleFontScaleChange}
              onSubtitleFontFamilyChange={editor.handleSubtitleFontFamilyChange}
              layers={editor.state.layers}
              selectedLayerId={editor.state.selectedLayerId}
              canvasObjects={editor.state.canvasObjects}
              selectedCanvasObjectId={editor.state.selectedCanvasObjectId}
              onUpdateLayer={editor.handleUpdateLayer}
              onUpdateCanvasObject={editor.handleUpdateCanvasObject}
              onSelectClip={editor.handleSelectClip}
              onDeleteLayer={editor.handleDeleteLayer}
              onSelectLayer={editor.handleSelectLayer}
            />
          </div>
        </div>
      </div>

      <Timeline
        duration={editor.state.duration}
        currentTime={editor.state.currentTime}
        layers={editor.state.layers}
        selectedLayerId={editor.state.selectedLayerId}
        onSeek={editor.handleSeek}
        onSelectLayer={editor.handleSelectLayer}
        onDeleteLayer={editor.handleDeleteLayer}
        onLayerTimingChange={editor.handleLayerTimingChange}
        onSplitLayer={editor.handleSplitLayer}
        onToggleLayerMute={editor.handleToggleLayerMute}
        onLayerStackOrderChange={editor.handleLayerStackOrderChange}
        mediaAssets={editor.state.mediaAssets}
        timelineClips={editor.state.timelineClips}
        canvasObjects={editor.state.canvasObjects}
        selectedClipId={editor.state.selectedClipId}
        onSelectClip={editor.handleSelectClip}
        onMoveClip={editor.handleMoveClip}
        onTrimClip={editor.handleTrimClip}
        onSplitClip={editor.handleSplitClip}
        onClipOrderChange={editor.handleClipOrderChange}
        onToggleClipMute={editor.handleToggleClipMute}
        onDeleteClip={editor.handleDeleteClip}
      />

      {showPreviewConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#4a3010] bg-[#120a02] p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-[#f2d40b]">Have you completed editing?</h3>
            <p className="mt-3 text-xs leading-relaxed text-[#c8b88a]">
              If yes, we will render the completed canvas into one preview video and open the preview page.
              Generated subtitles will be shown on top of that final video.
            </p>
            {previewStatus ? (
              <p className="mt-3 rounded-lg border border-[#3d2510] bg-[#1f1005] p-2 text-[10px] text-[#9a8060]">
                {previewStatus}
              </p>
            ) : null}
            {previewError ? (
              <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/30 p-2 text-[10px] text-red-200">
                {previewError}
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCancelPreviewConfirm}
                disabled={isRenderingPreview}
                className="rounded-lg border border-[#3d2510] px-3 py-2 text-xs font-semibold text-[#9a8060] hover:border-[#7a6040] hover:text-[#c8b88a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Not Yet
              </button>
              <button
                type="button"
                onClick={handleRenderPreview}
                disabled={isRenderingPreview}
                className="rounded-lg bg-[#c9b600] px-3 py-2 text-xs font-bold text-[#1a0c05] hover:bg-[#e0cc00] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRenderingPreview ? 'Rendering...' : 'Yes, Preview'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
