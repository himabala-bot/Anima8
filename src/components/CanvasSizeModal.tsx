import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { X, Check, Maximize2, Tv, Smartphone, Square, Sparkles } from 'lucide-react';

interface CanvasSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_CANVAS_SIZES = [
  {
    w: 1920,
    h: 1080,
    label: '1920 × 1080',
    subtitle: '16:9 Full HD (YouTube, Film)',
    icon: <Tv className="w-4 h-4 text-purple-600" />,
  },
  {
    w: 1280,
    h: 720,
    label: '1280 × 720',
    subtitle: '16:9 HD (Standard Animation)',
    icon: <Tv className="w-4 h-4 text-purple-600" />,
  },
  {
    w: 1080,
    h: 1080,
    label: '1080 × 1080',
    subtitle: '1:1 Square (Instagram, Feed)',
    icon: <Square className="w-4 h-4 text-pink-600" />,
  },
  {
    w: 1080,
    h: 1920,
    label: '1080 × 1920',
    subtitle: '9:16 Vertical (TikTok, Reels, Shorts)',
    icon: <Smartphone className="w-4 h-4 text-indigo-600" />,
  },
  {
    w: 2048,
    h: 2048,
    label: '2048 × 2048',
    subtitle: '1:1 2K Hi-Res Square',
    icon: <Sparkles className="w-4 h-4 text-amber-600" />,
  },
];

export const CanvasSizeModal: React.FC<CanvasSizeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const setCanvasDimensions = useStudioStore(
    (state) => state.setCanvasDimensions
  );

  const [selectedW, setSelectedW] = useState<number>(canvasWidth);
  const [selectedH, setSelectedH] = useState<number>(canvasHeight);

  if (!isOpen) return null;

  const handlePresetClick = (w: number, h: number) => {
    setSelectedW(w);
    setSelectedH(h);
  };

  const handleApply = () => {
    setCanvasDimensions(selectedW, selectedH);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Canvas Dimensions</h2>
              <p className="text-xs text-[#71717A]">
                Current: {canvasWidth} × {canvasHeight} px
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
        <div className="my-5 space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold text-[#18181B] mb-2">
              Standard 2D Animation Formats
            </label>
            <div className="space-y-1.5">
              {PRESET_CANVAS_SIZES.map((preset) => {
                const isSelected =
                  selectedW === preset.w && selectedH === preset.h;
                return (
                  <button
                    key={`${preset.w}x${preset.h}`}
                    onClick={() => handlePresetClick(preset.w, preset.h)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-zinc-100 border-black text-black font-semibold shadow-xs ring-1 ring-black'
                        : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#18181B] hover:bg-white hover:border-[#D4D4D8]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-white border border-[#E5E5EA] shadow-xs">
                        {preset.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{preset.label}</div>
                        <div className="text-[10px] text-[#71717A]">
                          {preset.subtitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-black flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Dimension Inputs */}
          <div className="p-3.5 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA] space-y-2">
            <span className="block text-xs font-semibold text-[#18181B]">
              Custom Resolution
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] text-[#71717A] mb-1">
                  Width (px)
                </span>
                <input
                  type="number"
                  min={200}
                  max={3840}
                  value={selectedW}
                  onChange={(e) =>
                    setSelectedW(
                      Math.max(200, Math.min(3840, Number(e.target.value)))
                    )
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-mono font-semibold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <span className="block text-[11px] text-[#71717A] mb-1">
                  Height (px)
                </span>
                <input
                  type="number"
                  min={200}
                  max={3840}
                  value={selectedH}
                  onChange={(e) =>
                    setSelectedH(
                      Math.max(200, Math.min(3840, Number(e.target.value)))
                    )
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-mono font-semibold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E5EA]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-black hover:bg-zinc-800 text-white shadow-sm transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              Set Canvas ({selectedW} × {selectedH})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
