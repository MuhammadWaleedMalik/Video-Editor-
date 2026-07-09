'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import EditorHeader from './EditorHeader';
import LeftSidebar from './LeftSidebar';
import VideoPreview from './VideoPreview';
import SubtitlesPanel from './SubtitlesPanel';
import Timeline from './Timeline';
import useVideoEditorController from './editorController';
import { buildEditorDraft, saveEditorDraft } from '@/lib/editorDraft';
import { renderEditedProjectForTranscription } from './renderEditedProject';

type MobilePanel = 'media' | 'settings' | null;

export default function VideoEditor() {
  const router = useRouter();
  const editor = useVideoEditorController();
  const hasTimeline = editor.state.timelineClips.length > 0;
  const previewAbortRef = useRef<AbortController | null>(null);
  const [showPreviewConfirm, setShowPreviewConfirm] = useState(false);
  const [isRenderingPreview, setIsRenderingPreview] = useState(false);
  const [previewStatus, setPreviewStatus] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);

  useEffect(() => {
    if (!mobilePanel) return undefined;
    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [mobilePanel]);

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

  function renderMediaPanel() {
    return (
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
    );
  }

  function renderSettingsPanel() {
    return (
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
    );
  }

  return (
    <div className="flex min-h-[100svh] flex-col overflow-x-hidden overflow-y-auto bg-[#1a0c05] pb-[env(safe-area-inset-bottom)] supports-[min-height:100dvh]:min-h-[100dvh]">
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
        onMediaOpen={() => setMobilePanel('media')}
        onEditOpen={() => setMobilePanel('settings')}
      />

      <div className="flex-1 overflow-visible overscroll-contain xl:min-h-[720px]">
        <div className="flex min-h-full flex-col gap-4 p-3 sm:p-4 xl:min-h-[720px] xl:flex-row xl:gap-0 xl:p-0">
          <div className="hidden h-[42svh] min-h-[260px] max-h-[520px] w-full shrink-0 xl:block xl:h-auto xl:max-h-none xl:w-72 2xl:w-96">
            {renderMediaPanel()}
          </div>

          <div className="flex min-h-[420px] min-w-0 flex-1 overflow-hidden rounded-3xl border border-[#3d2510]/70 bg-[#120a02]/40 shadow-[0_18px_55px_rgba(0,0,0,0.22)] sm:min-h-[560px] xl:min-h-[720px] xl:rounded-none xl:border-0 xl:bg-transparent xl:shadow-none">
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

          <div className="hidden h-[44svh] min-h-[280px] max-h-[560px] w-full shrink-0 xl:block xl:h-auto xl:max-h-none xl:w-72 2xl:w-96">
            {renderSettingsPanel()}
          </div>
        </div>
      </div>

      {mobilePanel ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm xl:hidden" onClick={() => setMobilePanel(null)}>
          <div
            className={`absolute top-0 flex h-full w-[min(92vw,430px)] flex-col overflow-hidden border-[#4a3010] bg-[#120a02] shadow-[0_24px_80px_rgba(0,0,0,0.72)] ${
              mobilePanel === 'media' ? 'left-0 border-r rounded-r-3xl' : 'right-0 border-l rounded-l-3xl'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#3d2510] px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#7a6040]">
                  {mobilePanel === 'media' ? 'Assets' : 'Edit'}
                </p>
                <h3 className="text-sm font-bold text-[#f2d40b]">
                  {mobilePanel === 'media' ? 'Media Library' : 'Settings & Subtitles'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-[#3d2510] text-[#c8b88a] hover:border-[#c9b600] hover:text-[#f2d40b]"
                aria-label="Close panel"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {mobilePanel === 'media' ? renderMediaPanel() : renderSettingsPanel()}
            </div>
          </div>
        </div>
      ) : null}

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
