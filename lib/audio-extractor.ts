/**
 * Extract audio track from video and return as blob URL
 */
export async function extractAudioFromVideo(videoUrl: string): Promise<{
  audioUrl: string;
  blob: Blob;
} | null> {
  try {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = reject;
      setTimeout(() => reject(new Error('Video load timeout')), 10000);
    });

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaElementAudioDestegySource(video);
    const gain = audioContext.createGain();
    destination.connect(gain);
    gain.connect(audioContext.destination);

    const mediaRecorder = new MediaRecorder(
      audioContext.createMediaStreamDestination().stream
    );

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        resolve({ audioUrl: url, blob });
        audioContext.close();
      };

      video.play();
      mediaRecorder.start();

      video.onended = () => {
        mediaRecorder.stop();
      };
    });
  } catch (error) {
    console.error('Audio extraction failed:', error);
    return null;
  }
}

/**
 * Simple audio extraction using canvas + Web Audio API
 */
export async function extractAudioSimple(videoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(videoUrl);
    const arrayBuffer = await response.arrayBuffer();

    // Try to extract audio track info (simplified)
    // In production, use ffmpeg.wasm or similar
    const audioUrl = videoUrl; // For now, return the same URL (contains both)
    return audioUrl;
  } catch (error) {
    console.error('Audio extraction failed:', error);
    return null;
  }
}
