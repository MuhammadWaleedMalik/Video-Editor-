'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Square, Upload, X } from 'lucide-react';
import { formatTime } from './videoCanvas';

interface BrowserVideoRecorderProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => void;
  onBrowse?: (file: File) => void;
  maxDurationSeconds?: number;
}

export default function BrowserVideoRecorder({
  isOpen,
  title,
  onClose,
  onCapture,
  onBrowse,
  maxDurationSeconds = 180,
}: BrowserVideoRecorderProps) {
  const browseInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const shouldSaveRef = useRef(false);
  const recordStartedAtRef = useRef(0);
  const autoStopRef = useRef(false);
  const recordLimitTimerRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');

  const cleanup = useCallback(() => {
    if (recordLimitTimerRef.current !== null) {
      window.clearTimeout(recordLimitTimerRef.current);
      recordLimitTimerRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    recorderRef.current = null;

    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setIsReady(false);
    setIsOpeningCamera(false);
    setElapsedSeconds(0);
  }, []);

  const stopRecorder = useCallback((saveResult: boolean) => {
    if (recordLimitTimerRef.current !== null) {
      window.clearTimeout(recordLimitTimerRef.current);
      recordLimitTimerRef.current = null;
    }

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    shouldSaveRef.current = saveResult;
    recorder.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  const openCamera = useCallback(async () => {
    if (isOpeningCamera || isReady) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available in this browser.');
      return;
    }

    setError('');
    setIsOpeningCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsReady(true);
    } catch {
      setError('Could not access camera/mic. Please allow permissions.');
    } finally {
      setIsOpeningCamera(false);
    }
  }, [isOpeningCamera, isReady]);

  useEffect(() => {
    if (!isOpen) cleanup();
    if (isOpen) {
      setError('');
      setElapsedSeconds(0);
      chunksRef.current = [];
      shouldSaveRef.current = false;
      autoStopRef.current = false;
    }
  }, [cleanup, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
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
  }, [isOpen]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  useEffect(() => {
    if (!isRecording) return;

    const updateElapsed = () => {
      const elapsed = Math.min(maxDurationSeconds, (Date.now() - recordStartedAtRef.current) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed >= maxDurationSeconds && !autoStopRef.current) {
        autoStopRef.current = true;
        stopRecorder(true);
      }
    };

    updateElapsed();
    const interval = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(interval);
  }, [isRecording, maxDurationSeconds, stopRecorder]);

  function handleStart() {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    if (recorderRef.current) return;
    if (typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser. Please use Browse Video instead.');
      return;
    }

    let options: MediaRecorderOptions = {};
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      options = { mimeType: 'video/webm;codecs=vp9' };
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      options = { mimeType: 'video/webm' };
    }

    const recorder = new MediaRecorder(stream, options);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      if (!shouldSaveRef.current) {
        shouldSaveRef.current = false;
        return;
      }

      const type = recorder.mimeType || 'video/webm';
      const file = new File([new Blob(chunksRef.current, { type })], `recorded-${Date.now()}.webm`, {
        type,
      });
      if (chunksRef.current.length > 0) {
        onCapture(file);
      }
      chunksRef.current = [];
      shouldSaveRef.current = false;
      autoStopRef.current = false;
      onClose();
    };
    recorderRef.current = recorder;
    recorder.start();
    shouldSaveRef.current = false;
    autoStopRef.current = false;
    recordStartedAtRef.current = Date.now();
    recordLimitTimerRef.current = window.setTimeout(() => {
      autoStopRef.current = true;
      stopRecorder(true);
    }, maxDurationSeconds * 1000);
    setElapsedSeconds(0);
    setIsRecording(true);
  }

  function handleStop() {
    stopRecorder(true);
  }

  function handleClose() {
    if (isRecording) stopRecorder(false);
    cleanup();
    onClose();
  }

  function handleBrowseFile(file: File | undefined) {
    if (!file || !onBrowse) return;
    onBrowse(file);
    handleClose();
  }

  if (!isOpen) return null;

  const progress = Math.max(0, Math.min(1, elapsedSeconds / Math.max(1, maxDurationSeconds)));
  const markerLabels = [0, 60, 120, maxDurationSeconds].filter((value, index, list) => (
    value <= maxDurationSeconds && list.indexOf(value) === index
  ));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black/80 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[96svh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-[#3d2510] bg-[#120a02] shadow-2xl supports-[height:100dvh]:max-h-[96dvh] sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#3d2510] px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold text-[#e8d5a0]">{title}</h2>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#7a6040]">
              Browse or record, max {maxDurationSeconds}s
            </p>
          </div>
          <button onClick={handleClose} className="flex h-11 w-11 items-center justify-center rounded-xl text-[#7a6040] hover:bg-[#2d1a08] hover:text-[#e8d5a0] sm:h-9 sm:w-9">
            <X size={15} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-5">
          <div className="min-w-0">
              <div className="relative aspect-video max-h-[46svh] overflow-hidden rounded-2xl border border-[#3d2510] bg-black shadow-inner sm:max-h-none">
              <video ref={videoRef} className="h-full w-full object-contain" muted playsInline autoPlay={false} />
              {!isReady ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050301] p-5 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#4a3010] bg-[#1b1006] text-[#c9b600]">
                    <Camera size={24} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#e8d5a0]">Camera preview is off</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#8b724c]">
                      Tap enable camera when you are ready. The browser will ask for camera and microphone permission.
                    </p>
                  </div>
                </div>
              ) : null}
              {isRecording ? (
                <div className="absolute left-3 top-3 rounded-full border border-red-300/40 bg-red-950/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-100 shadow-lg">
                  Recording
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-[#3d2510] bg-[#1a0c05] p-3 sm:p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#e8d5a0]">Recording timeline</span>
                <span className="font-mono text-[#c9b600]">
                  {formatTime(elapsedSeconds)} / {formatTime(maxDurationSeconds)}
                </span>
              </div>
              <div className="relative h-12 rounded-xl bg-[#0a0502] p-3 shadow-inner">
                <div className="absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#2d1a08]">
                  <div
                    className="h-full rounded-full bg-[#c9b600] shadow-[0_0_18px_rgba(201,182,0,0.35)] transition-[width] duration-200"
                    style={{ width: `${progress * 100}%` }}
                  />
                  {markerLabels.map((marker) => (
                    <span
                      key={marker}
                      className="absolute top-1/2 h-5 -translate-y-1/2 border-l border-[#c9b600]/45"
                      style={{ left: `${(marker / maxDurationSeconds) * 100}%` }}
                    >
                      <span className="absolute left-0 top-5 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold text-[#8b724c]">
                        {formatTime(marker)}
                      </span>
                    </span>
                  ))}
                  <span
                    className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1a0c05] bg-[#f2d40b] shadow-[0_0_14px_rgba(242,212,11,0.55)] transition-[left] duration-200"
                    style={{ left: `${progress * 100}%` }}
                  />
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-relaxed text-[#8b724c]">
                Recording automatically stops and saves at {formatTime(maxDurationSeconds)}.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {onBrowse ? (
              <button
                type="button"
                onClick={() => browseInputRef.current?.click()}
                className="flex min-h-24 touch-manipulation items-center gap-3 rounded-2xl border border-[#5a3b14] bg-[#241508] p-3 text-left transition hover:border-[#c9b600] hover:bg-[#2d1a08] sm:p-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#160d05] text-[#c9b600]">
                  <Upload size={20} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-[#e8d5a0]">Browse Video</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#8b724c]">
                    Choose a saved video from this device. Files over {formatTime(maxDurationSeconds)} are blocked after metadata loads.
                  </span>
                </span>
              </button>
            ) : null}

            <input
              ref={browseInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                handleBrowseFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />

            <div className="rounded-2xl border border-[#3d2510] bg-[#1b1006] p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#120a02] text-[#c9b600]">
                  <Camera size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#e8d5a0]">Record Video</h3>
                  <p className="text-[10px] text-[#8b724c]">Camera and microphone, up to {formatTime(maxDurationSeconds)}.</p>
                </div>
              </div>

              {error ? (
                <p className="mb-3 rounded-lg border border-red-900/60 bg-red-950/30 p-2 text-xs text-red-200">{error}</p>
              ) : null}

              <div className="grid gap-2">
                {!isReady ? (
                  <button
                    type="button"
                    onClick={openCamera}
                    disabled={isOpeningCamera}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c9b600] px-4 text-sm font-bold text-[#1a0c05] hover:bg-[#e0cc00] disabled:cursor-not-allowed disabled:bg-[#3d2510] disabled:text-[#7a6040]"
                  >
                    {isOpeningCamera ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                    {isOpeningCamera ? 'Opening camera...' : 'Enable Camera'}
                  </button>
                ) : null}

              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!isReady}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${
                    isReady
                      ? 'bg-[#c9b600] text-[#1a0c05] hover:bg-[#e0cc00]'
                      : 'cursor-not-allowed bg-[#3d2510] text-[#7a6040]'
                  }`}
                >
                  <Camera size={15} />
                  Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800"
                >
                  <Square size={14} />
                  Stop Recording
                </button>
              )}

                <button
                  type="button"
                  onClick={handleClose}
                  className="min-h-11 rounded-xl border border-[#3d2510] px-4 text-sm font-semibold text-[#8b724c] hover:border-[#5a4530] hover:text-[#e8d5a0]"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#3d2510] bg-[#160d05] p-3 text-[10px] leading-relaxed text-[#7a6040]">
              Tip: On iPhone/Safari, recording must start from a tap. This modal never auto-starts recording.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
