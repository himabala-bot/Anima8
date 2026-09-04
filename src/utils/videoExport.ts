import { Frame, AudioTrackState } from '../store/useStudioStore';

export interface ExportVideoOptions {
  frames: Frame[];
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  scale?: number; // 1x, 2x, 0.5x
  repeatCount?: number;
  backgroundColor?: string | null;
  fromFrameIndex?: number;
  toFrameIndex?: number;
  audioTrack?: AudioTrackState | null;
}

/**
 * Loads an image from dataURL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Composites all visible layers of a single frame onto a target 2D canvas context
 */
export async function renderFrameToContext(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  targetWidth: number,
  targetHeight: number,
  backgroundColor: string | null = '#ffffff'
): Promise<void> {
  // 1. Background fill
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.clearRect(0, 0, targetWidth, targetHeight);
  }

  // 2. Draw each visible layer in stack order
  for (const layer of frame.layers) {
    if (layer.visible && layer.dataUrl && layer.opacity > 0) {
      try {
        const img = await loadImage(layer.dataUrl);
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        ctx.restore();
      } catch (e) {
        console.warn('Failed to load layer image for export', e);
      }
    }
  }
}

/**
 * Detects the best supported browser video MIME type
 */
export function getSupportedVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return 'video/webm';
  }

  const candidateTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
  ];

  for (const mimeType of candidateTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return 'video/webm';
}

/**
 * Builds expanded sequence of frames accounting for exposure duration
 */
function buildExpandedFrameSequence(
  frames: Frame[],
  fromIdx = 0,
  toIdx = frames.length - 1
): Frame[] {
  const range = frames.slice(
    Math.max(0, fromIdx),
    Math.min(frames.length, toIdx + 1)
  );

  const expanded: Frame[] = [];
  for (const f of range) {
    const count = Math.max(1, f.exposure || 1);
    for (let i = 0; i < count; i++) {
      expanded.push(f);
    }
  }

  return expanded.length > 0 ? expanded : frames;
}

/**
 * Exports 2D animation sequence as WebM / MP4 video with multi-layer compositing, exposure timing, and audio
 */
export async function exportAnimationToVideo(
  options: ExportVideoOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const {
    frames,
    canvasWidth,
    canvasHeight,
    fps,
    scale = 1,
    repeatCount = 1,
    backgroundColor = '#ffffff',
    fromFrameIndex = 0,
    toFrameIndex = frames.length - 1,
    audioTrack = null,
  } = options;

  const sequence = buildExpandedFrameSequence(frames, fromFrameIndex, toFrameIndex);
  if (sequence.length === 0) {
    throw new Error('No frames to export.');
  }

  const targetWidth = Math.round(canvasWidth * scale);
  const targetHeight = Math.round(canvasHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Failed to create offscreen 2D canvas context.');
  }

  // Pre-render each unique frame to offscreen image bitmap for stutter-free recording
  const uniqueFrames = Array.from(new Set(sequence));
  const renderedCache = new Map<string, HTMLCanvasElement>();

  for (let i = 0; i < uniqueFrames.length; i++) {
    const f = uniqueFrames[i];
    const offCanvas = document.createElement('canvas');
    offCanvas.width = targetWidth;
    offCanvas.height = targetHeight;
    const offCtx = offCanvas.getContext('2d', { alpha: true })!;
    await renderFrameToContext(offCtx, f, targetWidth, targetHeight, backgroundColor);
    renderedCache.set(f.id, offCanvas);
  }

  // Setup Canvas Stream & Audio Stream
  const canvasStream = canvas.captureStream(fps);
  let combinedStream = canvasStream;
  let audioCtx: AudioContext | null = null;

  if (audioTrack && !audioTrack.muted && audioTrack.dataUrl) {
    try {
      audioCtx = new AudioContext();
      const audioEl = new Audio(audioTrack.dataUrl);
      audioEl.currentTime = audioTrack.offset || 0;
      audioEl.volume = audioTrack.volume || 1.0;
      const source = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination);

      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      audioEl.play().catch(() => {});
    } catch (e) {
      console.warn('Could not attach audio to video export', e);
    }
  }

  const mimeType = getSupportedVideoMimeType();
  const recordedChunks: Blob[] = [];

  return new Promise<Blob>((resolve, reject) => {
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 12000000,
      });
    } catch {
      recorder = new MediaRecorder(combinedStream);
    }

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
      const outputBlob = new Blob(recordedChunks, {
        type: recorder.mimeType || mimeType,
      });
      resolve(outputBlob);
    };

    recorder.onerror = (err) => {
      if (audioCtx) audioCtx.close().catch(() => {});
      reject(err);
    };

    recorder.start(100);

    const frameIntervalMs = 1000 / fps;
    const totalSteps = sequence.length * repeatCount;
    let currentStep = 0;

    const drawStep = (idx: number) => {
      const f = sequence[idx];
      const cached = renderedCache.get(f.id);
      if (cached) {
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(cached, 0, 0);
      }
    };

    drawStep(0);

    const intervalTimer = setInterval(() => {
      if (currentStep >= totalSteps) {
        clearInterval(intervalTimer);
        setTimeout(() => {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }, frameIntervalMs);
        return;
      }

      const seqIdx = currentStep % sequence.length;
      drawStep(seqIdx);

      currentStep++;
      if (onProgress) {
        onProgress(Math.min(100, Math.round((currentStep / totalSteps) * 100)));
      }
    }, frameIntervalMs);
  });
}

/**
 * Exports 2D animation sequence as Animated GIF
 */
export async function exportAnimationToGif(
  options: ExportVideoOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const {
    frames,
    canvasWidth,
    canvasHeight,
    fps,
    scale = 1,
    backgroundColor = '#ffffff',
    fromFrameIndex = 0,
    toFrameIndex = frames.length - 1,
  } = options;

  const sequence = buildExpandedFrameSequence(frames, fromFrameIndex, toFrameIndex);
  if (sequence.length === 0) {
    throw new Error('No frames to export.');
  }

  const maxGifDim = 800;
  let targetWidth = Math.round(canvasWidth * scale);
  let targetHeight = Math.round(canvasHeight * scale);
  if (targetWidth > maxGifDim || targetHeight > maxGifDim) {
    const factor = Math.min(maxGifDim / targetWidth, maxGifDim / targetHeight);
    targetWidth = Math.round(targetWidth * factor);
    targetHeight = Math.round(targetHeight * factor);
  }

  const frameImages: string[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: true })!;

  for (let i = 0; i < sequence.length; i++) {
    await renderFrameToContext(
      ctx,
      sequence[i],
      targetWidth,
      targetHeight,
      backgroundColor
    );
    frameImages.push(canvas.toDataURL('image/png'));
    if (onProgress) {
      onProgress(Math.round(((i + 1) / sequence.length) * 40));
    }
  }

  const gifshot = await getGifshotLibrary();

  return new Promise<Blob>((resolve, reject) => {
    const frameDuration = 1 / fps;

    gifshot.createGIF(
      {
        images: frameImages,
        gifWidth: targetWidth,
        gifHeight: targetHeight,
        interval: frameDuration,
        numFrames: frameImages.length,
        progressCallback: (captureProgress: number) => {
          if (onProgress) {
            onProgress(40 + Math.round(captureProgress * 60));
          }
        },
      },
      (obj: { error: boolean; errorCode: string; errorMsg: string; image: string }) => {
        if (!obj.error) {
          const dataUrl = obj.image;
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          resolve(blob);
        } else {
          reject(new Error(obj.errorMsg || 'Failed to generate GIF'));
        }
      }
    );
  });
}

/**
 * Loads gifshot library from CDN
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getGifshotLibrary(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== 'undefined' && (window as any).gifshot) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).gifshot;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.3.2/gifshot.min.js';
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).gifshot) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve((window as any).gifshot);
      } else {
        reject(new Error('gifshot failed to load from CDN.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load gifshot script.'));
    document.head.appendChild(script);
  });
}

/**
 * Helper to download Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
