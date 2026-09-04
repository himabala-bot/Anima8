import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore, Frame } from '../store/useStudioStore';
import { loadImage, renderFrameToContext } from '../utils/videoExport';
import {
  Play,
  Pause,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Repeat,
  Sparkles,
  Clock,
  CheckSquare,
  ClipboardCopy,
  ClipboardPaste,
  Music,
} from 'lucide-react';

interface FrameThumbnailProps {
  frame: Frame;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string | null;
  onSelect: (e: React.MouseEvent) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSetExposure: (exposure: number) => void;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
}

const FrameThumbnail: React.FC<FrameThumbnailProps> = ({
  frame,
  index,
  isActive,
  isSelected,
  canvasWidth,
  canvasHeight,
  canvasBgColor,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onSetExposure,
  canDelete,
  canMoveLeft,
  canMoveRight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderFrameToContext(
      ctx,
      frame,
      canvas.width,
      canvas.height,
      canvasBgColor
    ).catch(() => {});
  }, [frame, canvasWidth, canvasHeight, canvasBgColor]);

  const thumbWidth = 64;
  const thumbHeight = Math.max(36, Math.min(54, Math.round(thumbWidth * (canvasHeight / canvasWidth))));

  return (
    <div
      onClick={onSelect}
      className={`group relative flex-shrink-0 flex flex-col items-center p-1 rounded-2xl cursor-pointer transition-all duration-150 ${
        isActive
          ? 'bg-zinc-100 ring-2 ring-black shadow-sm'
          : isSelected
          ? 'bg-zinc-100 border-2 border-zinc-400'
          : 'bg-[#F7F7FA] hover:bg-white border border-[#E5E5EA] hover:border-black/30'
      }`}
    >
      {/* Thumbnail Canvas */}
      <div
        className="relative rounded-xl overflow-hidden border border-[#E5E5EA] bg-white shadow-inner flex items-center justify-center"
        style={{
          width: `${thumbWidth}px`,
          height: `${thumbHeight}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          width={128}
          height={Math.round(128 * (canvasHeight / canvasWidth))}
          className="w-full h-full object-contain"
        />

        {/* Frame Index Badge */}
        <span
          className={`absolute bottom-0.5 right-1 px-1 rounded text-[9px] font-mono font-bold ${
            isActive ? 'bg-black text-white' : 'bg-white/90 text-[#71717A]'
          }`}
        >
          #{index + 1}
        </span>

        {/* Exposure Hold Badge */}
        {frame.exposure > 1 && (
          <span className="absolute top-0.5 left-1 px-1 rounded bg-amber-500 text-white text-[8px] font-mono font-bold">
            {frame.exposure}x
          </span>
        )}
      </div>

      {/* Frame Exposure Stepper (when active) */}
      {isActive && (
        <div
          className="flex items-center gap-1 mt-1 px-1 rounded-lg bg-white border border-[#E5E5EA] text-[10px] text-[#71717A]"
          onClick={(e) => e.stopPropagation()}
        >
          <Clock className="w-2.5 h-2.5 text-black" />
          <button
            onClick={() => onSetExposure(Math.max(1, frame.exposure - 1))}
            className="hover:text-black font-bold"
          >
            -
          </button>
          <span className="font-mono font-bold text-[#18181B]">{frame.exposure}</span>
          <button
            onClick={() => onSetExposure(frame.exposure + 1)}
            className="hover:text-black font-bold"
          >
            +
          </button>
        </div>
      )}

      {/* Hover / Active Action Overlay */}
      <div
        className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-0.5 rounded-lg bg-white border border-[#E5E5EA] shadow-md transition-opacity z-20 ${
          isActive
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onMoveLeft}
          disabled={!canMoveLeft}
          title="Move Left"
          className="p-0.5 rounded text-[#71717A] hover:text-[#18181B] disabled:opacity-20 hover:bg-[#F1F1F5] transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate Frame"
          className="p-0.5 rounded text-[#71717A] hover:text-purple-600 hover:bg-[#F1F1F5] transition-colors"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          disabled={!canDelete}
          title="Delete Frame"
          className="p-0.5 rounded text-[#71717A] hover:text-rose-600 disabled:opacity-20 hover:bg-[#F1F1F5] transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <button
          onClick={onMoveRight}
          disabled={!canMoveRight}
          title="Move Right"
          className="p-0.5 rounded text-[#71717A] hover:text-[#18181B] disabled:opacity-20 hover:bg-[#F1F1F5] transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const Timeline: React.FC<{
  className?: string;
  onOpenAudioModal?: () => void;
}> = ({ className = '', onOpenAudioModal }) => {
  const frames = useStudioStore((state) => state.frames);
  const activeFrameIndex = useStudioStore((state) => state.activeFrameIndex);
  const selectedFrameIndices = useStudioStore((state) => state.selectedFrameIndices);
  const copiedFrames = useStudioStore((state) => state.copiedFrames);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const canvasBgColor = useStudioStore((state) => state.canvasBgColor);
  const fps = useStudioStore((state) => state.fps);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const isLooping = useStudioStore((state) => state.isLooping);
  const audioTrack = useStudioStore((state) => state.audioTrack);

  const setActiveFrame = useStudioStore((state) => state.setActiveFrame);
  const nextFrame = useStudioStore((state) => state.nextFrame);
  const prevFrame = useStudioStore((state) => state.prevFrame);
  const addFrame = useStudioStore((state) => state.addFrame);
  const duplicateFrame = useStudioStore((state) => state.duplicateFrame);
  const deleteFrame = useStudioStore((state) => state.deleteFrame);
  const reorderFrames = useStudioStore((state) => state.reorderFrames);
  const setFrameExposure = useStudioStore((state) => state.setFrameExposure);
  const setFps = useStudioStore((state) => state.setFps);
  const setIsPlaying = useStudioStore((state) => state.setIsPlaying);
  const setIsLooping = useStudioStore((state) => state.setIsLooping);
  const toggleFrameSelection = useStudioStore((state) => state.toggleFrameSelection);
  const clearFrameSelection = useStudioStore((state) => state.clearFrameSelection);
  const duplicateSelectedFrames = useStudioStore((state) => state.duplicateSelectedFrames);
  const deleteSelectedFrames = useStudioStore((state) => state.deleteSelectedFrames);
  const copySelectedFrames = useStudioStore((state) => state.copySelectedFrames);
  const pasteFrames = useStudioStore((state) => state.pasteFrames);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Playback engine respecting frame exposures & audio sync
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      return;
    }

    if (audioTrack && !audioTrack.muted && audioTrack.dataUrl) {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio(audioTrack.dataUrl);
      }
      audioElementRef.current.currentTime = audioTrack.offset || 0;
      audioElementRef.current.volume = audioTrack.volume || 1.0;
      audioElementRef.current.play().catch(() => {});
    }

    let holdCounter = 0;
    const interval = setInterval(() => {
      const state = useStudioStore.getState();
      const current = state.activeFrameIndex;
      const currentFrame = state.frames[current];
      const targetExposure = currentFrame ? currentFrame.exposure || 1 : 1;

      holdCounter++;
      if (holdCounter < targetExposure) {
        return;
      }
      holdCounter = 0;

      const total = state.frames.length;
      if (current < total - 1) {
        state.setActiveFrame(current + 1);
      } else if (state.isLooping) {
        state.setActiveFrame(0);
        if (audioElementRef.current) {
          audioElementRef.current.currentTime = audioTrack?.offset || 0;
        }
      } else {
        state.setIsPlaying(false);
      }
    }, 1000 / fps);

    return () => {
      clearInterval(interval);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [isPlaying, fps, frames, audioTrack]);

  const hasMultiSelection = selectedFrameIndices.length > 1;

  return (
    <div
      className={`flex flex-col gap-2 p-2.5 md:p-3 rounded-2xl md:rounded-3xl bg-white border border-[#E5E5EA] shadow-lg shadow-zinc-200/50 select-none ${className}`}
    >
      {/* Row 1: Horizontally scrollable filmstrip */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-300"
      >
        {frames.map((frame, idx) => (
          <FrameThumbnail
            key={frame.id}
            frame={frame}
            index={idx}
            isActive={idx === activeFrameIndex}
            isSelected={selectedFrameIndices.includes(idx)}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            canvasBgColor={canvasBgColor}
            onSelect={(e) => toggleFrameSelection(idx, e.shiftKey || e.ctrlKey || e.metaKey)}
            onDuplicate={() => duplicateFrame(idx)}
            onDelete={() => deleteFrame(idx)}
            onMoveLeft={() => reorderFrames(idx, idx - 1)}
            onMoveRight={() => reorderFrames(idx, idx + 1)}
            onSetExposure={(exp) => setFrameExposure(idx, exp)}
            canDelete={frames.length > 1}
            canMoveLeft={idx > 0}
            canMoveRight={idx < frames.length - 1}
          />
        ))}

        {/* Add Frame Button */}
        <button
          onClick={() => addFrame()}
          title="Add New Frame"
          aria-label="Add Frame"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[54px] h-12 rounded-2xl border-2 border-dashed border-[#E5E5EA] hover:border-black hover:bg-zinc-100/50 text-[#71717A] hover:text-black transition-all duration-150 group"
        >
          <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
          <span className="text-[9px] font-semibold">Add</span>
        </button>
      </div>

      {/* Row 2: Multi-Frame Action Bar OR Transport Controls */}
      {hasMultiSelection ? (
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-300 bg-zinc-100 p-2 rounded-xl text-xs text-black font-medium">
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-black" />
            <span>{selectedFrameIndices.length} frames selected</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={copySelectedFrames}
              title="Copy Selected Frames"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-black transition-colors"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
            <button
              onClick={duplicateSelectedFrames}
              title="Duplicate Selected Frames"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-black transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={deleteSelectedFrames}
              disabled={frames.length <= selectedFrameIndices.length}
              title="Delete Selected Frames"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 disabled:opacity-30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={clearFrameSelection}
              className="px-2 py-1 rounded-lg text-[#71717A] hover:text-black hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#E5E5EA] text-xs text-[#18181B]">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevFrame}
              title="Previous Frame (,)"
              className="p-1.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause (Space)' : 'Play Animation (Space)'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                isPlaying
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                  : 'bg-black hover:bg-zinc-800 text-white shadow-sm'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={nextFrame}
              title="Next Frame (.)"
              className="p-1.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
              className={`p-1.5 rounded-xl transition-colors ${
                isLooping
                  ? 'bg-black text-white font-bold'
                  : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {/* Frame Counter */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F7F7FA] border border-[#E5E5EA] font-mono text-[#18181B] font-semibold text-xs ml-0.5">
              <span className="text-[#71717A]">Frame</span>
              <span className="text-black font-bold">{activeFrameIndex + 1}</span>
              <span className="text-[#A1A1AA]">/</span>
              <span>{frames.length}</span>
            </div>

            {/* Paste Button if clipboard has frames */}
            {copiedFrames && copiedFrames.length > 0 && (
              <button
                onClick={pasteFrames}
                title={`Paste ${copiedFrames.length} Frames`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-100 border border-zinc-300 text-black font-semibold"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste ({copiedFrames.length})</span>
              </button>
            )}
          </div>

          {/* Audio & FPS Controls */}
          <div className="flex items-center gap-2">
            {/* Audio Chip */}
            <button
              onClick={onOpenAudioModal}
              title="Audio Track Settings"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs transition-colors ${
                audioTrack
                  ? 'bg-black text-white border-black font-bold'
                  : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#71717A] hover:text-[#18181B]'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{audioTrack ? 'Audio Active' : '+ Audio'}</span>
            </button>

            {/* FPS Slider */}
            <div className="flex items-center gap-2 bg-[#F7F7FA] px-3 py-1 rounded-xl border border-[#E5E5EA]">
              <div className="flex items-center gap-1 text-[#71717A] text-[11px] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>FPS:</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-16 md:w-20 h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-black"
              />
              <span className="font-mono text-xs font-bold text-black w-6 text-right">
                {fps}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
