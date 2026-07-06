'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BrowserVideoRecorderProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function BrowserVideoRecorder({
  isOpen,
  title,
  onClose,
  onCapture,
}: BrowserVideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const shouldSaveRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

  const cleanup = useCallback(() => {
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
  }, []);

  const stopRecorder = useCallback((saveResult: boolean) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    shouldSaveRef.current = saveResult;
    recorder.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    let cancelled = false;
    setError('');
    setIsReady(false);
    setIsRecording(false);
    chunksRef.current = [];

    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not available in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setIsReady(true);
      } catch {
        setError('Could not access camera/mic. Please allow permissions.');
      }
    }

    openCamera();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [cleanup, isOpen]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  function handleStart() {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    if (recorderRef.current) return;

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
      onClose();
    };
    recorderRef.current = recorder;
    recorder.start();
    shouldSaveRef.current = false;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="w-full max-w-lg bg-[#120a02] border border-[#3d2510] rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3d2510]">
          <h2 className="text-[#c8b88a] text-sm font-semibold">{title}</h2>
          <button onClick={handleClose} className="w-7 h-7 rounded-lg text-[#7a6040] hover:text-[#e8d5a0]">
            <X size={15} />
          </button>
        </div>

        <div className="p-3">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video ref={videoRef} className="w-full h-full" muted playsInline autoPlay />
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-300">{error}</p>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-2">
              {!isRecording ? (
                <button
                  onClick={handleStart}
                  disabled={!isReady}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    isReady
                      ? 'bg-[#c9b600] text-[#1a0c05] hover:bg-[#e0cc00]'
                      : 'bg-[#3d2510] text-[#7a6040] cursor-not-allowed'
                  }`}
                >
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-700 text-white hover:bg-red-800"
                >
                  Stop Recording
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
