import React, { useState, useEffect, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import {
  exportAnimationToVideo,
  exportAnimationToGif,
  downloadBlob,
  renderFrameToContext,
} from '../utils/videoExport';
import {
  X,
  Film,
  Download,
  Loader2,
  CheckCircle2,
  Music,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'video' | 'gif' | 'png';

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const frames = useStudioStore((state) => state.frames);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const canvasBgColor = useStudioStore((state) => state.canvasBgColor);
  const fps = useStudioStore((state) => state.fps);
  const projectName = useStudioStore((state) => state.projectName);
  const audioTrack = useStudioStore((state) => state.audioTrack);

  const [format, setFormat] = useState<ExportFormat>('video');
  const [scale, setScale] = useState<number>(1);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [exportBg, setExportBg] = useState<string>(canvasBgColor || '#ffffff');
  const [fromFrame, setFromFrame] = useState<number>(1);
  const [toFrame, setToFrame] = useState<number>(frames.length);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExportBg(canvasBgColor || '#ffffff');
      setToFrame(frames.length);
    }
  }, [isOpen, canvasBgColor, frames.length]);

  // Live preview animation loop inside modal
  useEffect(() => {
    if (!isOpen || frames.length === 0) return;

    let frameIdx = Math.max(0, fromFrame - 1);
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const interval = setInterval(() => {
      const currentFrame = frames[frameIdx];
      if (currentFrame) {
        renderFrameToContext(
          ctx,
          currentFrame,
          canvas.width,
          canvas.height,
          exportBg
        );
      }
      frameIdx++;
      if (frameIdx >= Math.min(frames.length, toFrame)) {
        frameIdx = Math.max(0, fromFrame - 1);
      }
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isOpen, frames, fps, exportBg, fromFrame, toFrame]);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);
      setIsCompleted(false);
      setStatusMessage('Preparing animation layers and audio...');

      const safeName = (projectName || 'animation')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_');

      const fromIdx = Math.max(0, fromFrame - 1);
      const toIdx = Math.min(frames.length - 1, toFrame - 1);

      if (format === 'video') {
        setStatusMessage('Recording video stream with audio...');
        const blob = await exportAnimationToVideo(
          {
            frames,
            canvasWidth,
            canvasHeight,
            fps,
            scale,
            repeatCount,
            backgroundColor: exportBg,
            fromFrameIndex: fromIdx,
            toFrameIndex: toIdx,
            audioTrack: includeAudio ? audioTrack : null,
          },
          (pct) => setProgress(pct)
        );

        downloadBlob(
          blob,
          `${safeName}_${Math.round(canvasWidth * scale)}x${Math.round(canvasHeight * scale)}.webm`
        );
      } else if (format === 'gif') {
        setStatusMessage('Compiling animated GIF...');
        const blob = await exportAnimationToGif(
          {
            frames,
            canvasWidth,
            canvasHeight,
            fps,
            scale: Math.min(1, scale),
            backgroundColor: exportBg,
            fromFrameIndex: fromIdx,
            toFrameIndex: toIdx,
          },
          (pct) => setProgress(pct)
        );

        downloadBlob(blob, `${safeName}_animation.gif`);
      } else if (format === 'png') {
        setStatusMessage('Exporting active frame PNG...');
        const currentFrame = frames[useStudioStore.getState().activeFrameIndex];
        const outCanvas = document.createElement('canvas');
        outCanvas.width = canvasWidth * scale;
        outCanvas.height = canvasHeight * scale;
        const outCtx = outCanvas.getContext('2d')!;

        await renderFrameToContext(
          outCtx,
          currentFrame,
          outCanvas.width,
          outCanvas.height,
          exportBg
        );

        outCanvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${safeName}_frame_${useStudioStore.getState().activeFrameIndex + 1}.png`);
          }
        }, 'image/png');
      }

      setIsCompleted(true);
      setStatusMessage('Export completed successfully!');
    } catch (err: unknown) {
      console.error(err);
      setStatusMessage(
        err instanceof Error ? err.message : 'Export failed. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Export 2D Animation</h2>
              <p className="text-xs text-[#71717A]">
                Multi-layer compositing • {frames.length} frames at {fps} FPS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Live Preview Box */}
            <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA] flex-shrink-0">
              <div className="relative w-44 h-28 rounded-xl overflow-hidden shadow-inner border border-[#E5E5EA] bg-white flex items-center justify-center">
                <canvas
                  ref={previewCanvasRef}
                  width={320}
                  height={Math.round(320 * (canvasHeight / canvasWidth))}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[11px] font-mono text-[#71717A] mt-2 font-medium">
                Output: {Math.round(canvasWidth * scale)} × {Math.round(canvasHeight * scale)} px
              </span>
            </div>

            {/* Settings Column */}
            <div className="flex-1 space-y-3">
              {/* Format Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'video', label: 'Video (WebM)' },
                      { id: 'gif', label: 'GIF' },
                      { id: 'png', label: 'PNG' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-medium border transition-all ${
                        format === f.id
                          ? 'bg-black border-black text-white font-bold shadow-xs'
                          : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#71717A] hover:bg-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Scale */}
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
                  Resolution Scale
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { s: 1, label: '1× (Original)' },
                    { s: 2, label: '2× (2K)' },
                    { s: 4, label: '4× (4K Ultra)' },
                  ].map((item) => (
                    <button
                      key={item.s}
                      onClick={() => setScale(item.s)}
                      className={`py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        scale === item.s
                          ? 'bg-black border-black text-white font-bold shadow-xs'
                          : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#71717A] hover:bg-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Inclusion Option */}
              {format === 'video' && audioTrack && (
                <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 border border-zinc-200 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={includeAudio}
                    onChange={(e) => setIncludeAudio(e.target.checked)}
                    className="rounded border-zinc-300 text-black focus:ring-black"
                  />
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-900">
                    <Music className="w-3.5 h-3.5" />
                    <span>Include Audio ({audioTrack.name})</span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Frame Range Selector */}
          <div className="p-3 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA] space-y-2">
            <span className="block text-xs font-semibold text-[#18181B]">
              Frame Range
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-[10px] text-[#71717A] mb-1">From Frame:</span>
                <input
                  type="number"
                  min={1}
                  max={frames.length}
                  value={fromFrame}
                  onChange={(e) => setFromFrame(Math.max(1, Math.min(frames.length, Number(e.target.value))))}
                  className="w-full px-2.5 py-1 rounded-xl bg-white border border-[#E5E5EA] text-xs font-mono font-bold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <span className="block text-[10px] text-[#71717A] mb-1">To Frame:</span>
                <input
                  type="number"
                  min={1}
                  max={frames.length}
                  value={toFrame}
                  onChange={(e) => setToFrame(Math.max(1, Math.min(frames.length, Number(e.target.value))))}
                  className="w-full px-2.5 py-1 rounded-xl bg-white border border-[#E5E5EA] text-xs font-mono font-bold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Background Selector */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-[#18181B]">Canvas Background:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: '#ffffff', label: 'White' },
                { id: '#000000', label: 'Black' },
                { id: 'transparent', label: 'Transparent' },
              ].map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setExportBg(bg.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all ${
                    exportBg === bg.id
                      ? 'bg-black border-black text-white font-bold'
                      : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#71717A]'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-[#71717A]">
                <span>{statusMessage}</span>
                <span className="font-bold text-black">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E5E5EA] overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E5EA] flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-black hover:bg-zinc-800 text-white shadow-sm transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rendering...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
