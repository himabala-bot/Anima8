import React from 'react';
import { useStudioStore, BrushPresetType } from '../store/useStudioStore';
import {
  PenLine,
  Paintbrush,
  Highlighter,
  Feather,
  Sparkles,
} from 'lucide-react';

const BRUSH_PRESETS: {
  id: BrushPresetType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'pencil',
    label: 'Pencil',
    desc: '2.5px • 45%',
    icon: <PenLine className="w-3.5 h-3.5" />,
  },
  {
    id: 'ink',
    label: 'Ink Pen',
    desc: '6px • 100%',
    icon: <Paintbrush className="w-3.5 h-3.5" />,
  },
  {
    id: 'marker',
    label: 'Marker',
    desc: '24px • 45%',
    icon: <Highlighter className="w-3.5 h-3.5" />,
  },
  {
    id: 'soft',
    label: 'Soft Brush',
    desc: '32px • 35%',
    icon: <Feather className="w-3.5 h-3.5" />,
  },
  {
    id: 'hard',
    label: 'Hard Brush',
    desc: '12px • 100%',
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
];

export const BrushPresets: React.FC<{ className?: string }> = ({ className = '' }) => {
  const brushPreset = useStudioStore((state) => state.brushPreset);
  const setBrushPreset = useStudioStore((state) => state.setBrushPreset);

  return (
    <div className={`space-y-1 ${className}`}>
      <span className="block text-[10px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
        Brush Presets
      </span>
      <div className="grid grid-cols-1 gap-1">
        {BRUSH_PRESETS.map((preset) => {
          const isSelected = brushPreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => setBrushPreset(preset.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isSelected
                  ? 'bg-zinc-100 border-black text-black font-bold shadow-xs'
                  : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#18181B] hover:bg-white hover:border-[#D4D4D8]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1 rounded-lg ${
                    isSelected ? 'bg-black text-white' : 'bg-white text-[#71717A]'
                  }`}
                >
                  {preset.icon}
                </div>
                <div className="text-left leading-tight">
                  <div className="font-bold text-[11px]">{preset.label}</div>
                  <div className="text-[9px] text-[#71717A]">{preset.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
