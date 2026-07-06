'use client';

import { useRouter } from 'next/navigation';
import EditorHeader from './EditorHeader';
import LeftSidebar from './LeftSidebar';
import VideoPreview from './VideoPreview';
import SubtitlesPanel from './SubtitlesPanel';
import Timeline from './Timeline';
import VideoUpload from './VideoUpload';
import PreviewModal from './PreviewModal';
import useVideoEditorController from './editorController';
import { buildEditorDraft, saveEditorDraft } from '@/lib/editorDraft';

export default function VideoEditor() {
  const router = useRouter();
  const editor = useVideoEditorController();
  const hasVideo = Boolean(editor.state.videoUrl);

  function handleImport() {
    if (!editor.state.videoUrl) return;
    saveEditorDraft(buildEditorDraft(editor.state, editor.title));
    router.push('/import');
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#1a0c05]">
      <EditorHeader
        title={editor.title}
        format={editor.state.format}
        onTitleChange={editor.setTitle}
        onFormatChange={editor.handleFormatChange}
        onPreviewOpen={() => editor.setShowPreview(true)}
        onImport={handleImport}
      />

      <div className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden">
        <div className="flex min-h-full flex-col md:h-full md:min-h-0 md:flex-row">
          <div className="w-full shrink-0 max-h-[34vh] md:h-full md:max-h-none md:w-60">
            <LeftSidebar
              layers={editor.state.layers}
              selectedLayerId={editor.state.selectedLayerId}
              onSelectLayer={editor.handleSelectLayer}
              onAddLayer={editor.handleAddLayer}
              onDeleteLayer={editor.handleDeleteLayer}
            />
          </div>

          <div className="flex min-h-[360px] min-w-0 flex-1 md:h-full md:min-h-0">
            {hasVideo ? (
              <VideoPreview
                videoUrl={editor.state.videoUrl!}
                isPlaying={editor.state.isPlaying}
                currentTime={editor.state.currentTime}
                trimStart={editor.state.trimStart}
                trimEnd={editor.state.trimEnd || editor.state.duration}
                subtitles={editor.state.subtitles}
                format={editor.state.format}
                onPlayPause={editor.handlePlayPause}
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
                selectedLayerId={editor.state.selectedLayerId}
                onSelectLayer={editor.handleSelectLayer}
                onUpdateLayer={editor.handleUpdateLayer}
                onAddLayerAtCoords={editor.handleAddLayerAtCoords}
              />
            ) : (
              <VideoUpload onVideoUpload={editor.handleVideoUpload} />
            )}
          </div>

          <div className="w-full shrink-0 max-h-[46vh] md:h-full md:max-h-none md:w-72">
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
              onUpdateLayer={editor.handleUpdateLayer}
              onDeleteLayer={editor.handleDeleteLayer}
              onSelectLayer={editor.handleSelectLayer}
            />
          </div>
        </div>
      </div>

      <Timeline
        duration={editor.state.duration}
        currentTime={editor.state.currentTime}
        trimStart={editor.state.trimStart}
        trimEnd={editor.state.trimEnd || editor.state.duration}
        subtitles={editor.state.subtitles}
        layers={editor.state.layers}
        selectedLayerId={editor.state.selectedLayerId}
        hasAudio={editor.state.hasAudio}
        audioMuted={editor.state.audioMuted}
        waveformData={editor.waveformData}
        onSeek={editor.handleSeek}
        onTrimChange={editor.handleTrimChange}
        onAudioMuteToggle={editor.handleAudioMuteToggle}
        onAudioRemove={editor.handleAudioRemove}
        onSelectLayer={editor.handleSelectLayer}
        onLayerTimingChange={editor.handleLayerTimingChange}
        onLayerOrderChange={editor.handleLayerOrderChange}
      />

      {editor.showPreview && hasVideo && (
        <PreviewModal
          videoUrl={editor.state.videoUrl!}
          format={editor.state.format}
          subtitles={editor.state.subtitles}
          audioMuted={editor.state.audioMuted}
          trimStart={editor.state.trimStart}
          trimEnd={editor.state.trimEnd || editor.state.duration}
          onClose={() => editor.setShowPreview(false)}
          subtitleFontScale={editor.state.subtitleFontScale}
          subtitleFontFamily={editor.state.subtitleFontFamily}
          layers={editor.state.layers}
        />
      )}
    </div>
  );
}
