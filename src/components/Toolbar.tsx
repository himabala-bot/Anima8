import React, { useState, useRef, useEffect } from 'react';
import {
  useStudioStore,
  ToolType,
} from '../store/useStudioStore';
import { BrushPresets } from './BrushPresets';
import {
  Paintbrush,
  Eraser,
  Minus,
  Square,
  Circle,
  PaintBucket,
  Pipette,
  Palette,
  Sliders,
  ChevronDown,
  Check,
  History,
  Layers,
  MousePointer,
  Hand,
} from 'lucide-react';

interface ToolbarProps {
  className?: string;
  onToggleLayers?: () => void;
  onToggleReference?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  className = '',
}) => {
  const activeTool = useStudioStore((state) => state.activeTool);
  const selectedColor = useStudioStore((state) => state.selectedColor);
  const palette = useStudioStore((state) => state.palette);
  const activePaletteName = useStudioStore((state) => state.activePaletteName);
  const recentColors = useStudioStore((state) => state.recentColors);
  const brushSize = useStudioStore((state) => state.brushSize);
  const brushOpacity = useStudioStore((state) => state.brushOpacity);
  const eraserSize = useStudioStore((state) => state.eraserSize);
  const shapeFill = useStudioStore((state) => state.shapeFill);
  const canvasBgColor = useStudioStore((state) => state.canvasBgColor);

  const setTool = useStudioStore((state) => state.setTool);
  const setColor = useStudioStore((state) => state.setColor);
  const setPalette = useStudioStore((state) => state.setPalette);
  const setBrushSize = useStudioStore((state) => state.setBrushSize);
  const setBrushOpacity = useStudioStore((state) => state.setBrushOpacity);
  const setEraserSize = useStudioStore((state) => state.setEraserSize);
  const setShapeFill = useStudioStore((state) => state.setShapeFill);
  const setCanvasBgColor = useStudioStore((state) => state.setCanvasBgColor);

  // Popover states
  const [isBrushSettingsOpen, setIsBrushSettingsOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [isBgOpen, setIsBgOpen] = useState<boolean>(false);

  const brushSettingsRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        brushSettingsRef.current &&
        !brushSettingsRef.current.contains(e.target as Node)
      ) {
        setIsBrushSettingsOpen(false);
      }
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsPaletteOpen(false);
      }
      if (bgRef.current && !bgRef.current.contains(e.target as Node)) {
        setIsBgOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tools: {
    id: ToolType;
    label: string;
    icon: React.ReactNode;
    shortcut: string;
  }[] = [
    { id: 'select', label: 'Select & Transform', icon: <MousePointer className="w-3.5 h-3.5" />, shortcut: 'V' },
    { id: 'brush', label: 'Smooth Brush', icon: <Paintbrush className="w-3.5 h-3.5" />, shortcut: 'B' },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-3.5 h-3.5" />, shortcut: 'E' },
    { id: 'line', label: 'Line', icon: <Minus className="w-3.5 h-3.5" />, shortcut: 'L' },
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-3.5 h-3.5" />, shortcut: 'R' },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-3.5 h-3.5" />, shortcut: 'C' },
    { id: 'bucket', label: 'Fill', icon: <PaintBucket className="w-3.5 h-3.5" />, shortcut: 'G' },
    { id: 'picker', label: 'Picker', icon: <Pipette className="w-3.5 h-3.5" />, shortcut: 'I' },
    { id: 'hand', label: 'Hand Pan', icon: <Hand className="w-3.5 h-3.5" />, shortcut: 'H' },
  ];

  return (
    <aside
      className={`relative flex md:flex-col items-center justify-start gap-1 p-1.5 rounded-2xl md:rounded-3xl bg-white border border-[#E5E5EA] shadow-lg shadow-zinc-200/50 select-none z-30 overflow-visible ${className}`}
    >
      {/* 2-Column Compact Grid on Desktop, Horizontal Scroll on Mobile */}
      <div className="flex md:grid md:grid-cols-2 items-center gap-1 overflow-x-auto md:overflow-visible">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              aria-label={t.label}
              className={`relative flex items-center justify-center min-w-[34px] min-h-[34px] w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl transition-all duration-150 group ${
                isActive
                  ? 'bg-black text-white shadow-md shadow-black/20 scale-105'
                  : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
              }`}
            >
              {t.icon}
              <span className="hidden md:group-hover:block absolute left-full ml-3 px-2.5 py-1 rounded-xl bg-[#18181B] text-white text-[11px] font-medium whitespace-nowrap z-50 pointer-events-none shadow-lg animate-in fade-in duration-100">
                {t.label} <span className="text-zinc-400 ml-1 font-mono">[{t.shortcut}]</span>
              </span>
            </button>
          );
        })}

        {/* Brush Settings Button */}
        <div className="relative" ref={brushSettingsRef}>
          <button
            onClick={() => setIsBrushSettingsOpen(!isBrushSettingsOpen)}
            title="Brush & Tool Properties"
            aria-label="Tool Properties"
            className={`flex items-center justify-center min-w-[34px] min-h-[34px] w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl transition-colors ${
              isBrushSettingsOpen
                ? 'bg-black text-white font-bold'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Compact Dropdown Flyout Panel */}
          {isBrushSettingsOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-full bottom-full md:bottom-0 md:top-auto mb-3 md:mb-0 md:ml-3 w-60 p-3 rounded-2xl bg-white border border-[#E5E5EA] shadow-2xl z-50 text-[#18181B] animate-in fade-in zoom-in-95 duration-150 space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300">
              {activeTool === 'eraser' ? (
                /* Eraser Settings */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E5EA]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#18181B]">
                      <Eraser className="w-3.5 h-3.5 text-black" />
                      <span>Eraser</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-black">
                      {eraserSize}px
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-[#71717A] mb-1">
                      <span>Size</span>
                      <span className="font-mono text-black font-bold">{eraserSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={120}
                      value={eraserSize}
                      onChange={(e) => setEraserSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-black"
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] font-semibold text-[#71717A] mb-1">
                      Quick Sizes
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {[4, 8, 16, 32, 64].map((size) => (
                        <button
                          key={size}
                          onClick={() => setEraserSize(size)}
                          className={`py-0.5 rounded-lg text-[10px] font-mono font-semibold text-center border transition-all ${
                            eraserSize === size
                              ? 'bg-black text-white border-black shadow-xs'
                              : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#18181B] hover:bg-[#F1F1F5]'
                          }`}
                        >
                          {size}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Brush & Presets Settings */
                <div className="space-y-2.5">
                  <BrushPresets />

                  <div className="pt-2 border-t border-[#E5E5EA] space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-[#71717A] mb-0.5">
                        <span>Custom Size</span>
                        <span className="font-mono text-black font-bold">{brushSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={120}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-[#71717A] mb-0.5">
                        <span>Opacity</span>
                        <span className="font-mono text-black font-bold">
                          {Math.round(brushOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        value={Math.round(brushOpacity * 100)}
                        onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
                        className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    {(activeTool === 'rectangle' || activeTool === 'circle') && (
                      <div className="pt-1.5 border-t border-[#E5E5EA] flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#71717A]">Fill</span>
                        <button
                          onClick={() => setShapeFill(!shapeFill)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                            shapeFill ? 'bg-black text-white' : 'bg-[#F1F1F5] text-[#71717A]'
                          }`}
                        >
                          {shapeFill ? 'Solid' : 'Outline'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block w-full h-[1px] bg-[#E5E5EA] my-0.5 flex-shrink-0" />
      <div className="md:hidden w-[1px] h-6 bg-[#E5E5EA] mx-0.5 flex-shrink-0" />

      {/* Color Studio & Canvas Background Row */}
      <div className="flex md:grid md:grid-cols-2 items-center gap-1">
        {/* Color Studio Swatch */}
        <div className="relative" ref={paletteRef}>
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            title="Color Studio & Palettes"
            aria-label="Color Studio"
            className="relative flex items-center justify-center min-w-[34px] min-h-[34px] w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl bg-white border-2 border-[#E5E5EA] hover:border-black transition-all shadow-sm group overflow-hidden"
          >
            <div
              className="w-4 h-4 md:w-4.5 md:h-4.5 rounded-md shadow-inner ring-1 ring-black/10 transition-transform group-hover:scale-110"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-white border border-[#E5E5EA] text-[#71717A]">
              <ChevronDown className="w-1.5 h-1.5" />
            </span>
          </button>

          {/* Compact Dropdown Flyout Panel */}
          {isPaletteOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-full bottom-full md:bottom-0 md:top-auto mb-3 md:mb-0 md:ml-3 w-64 p-3 rounded-2xl bg-white border border-[#E5E5EA] shadow-2xl z-50 text-[#18181B] animate-in fade-in zoom-in-95 duration-150 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5EA]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#18181B]">
                  <Palette className="w-3.5 h-3.5 text-black" />
                  <span>Color Studio</span>
                </div>
                <div
                  className="w-4 h-4 rounded-md border border-black/20 shadow-2xs"
                  style={{ backgroundColor: selectedColor }}
                />
              </div>

              {/* Color Wheel & Hex Code Input Row */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F7F7FA] border border-[#E5E5EA]">
                {/* Visual Color Wheel Picker Trigger */}
                <label
                  title="Click to Open Color Wheel / Custom Spectrum"
                  className="relative w-8 h-8 rounded-full cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-transform flex-shrink-0 border-2 border-white ring-1 ring-black/15 overflow-hidden flex items-center justify-center group"
                  style={{
                    background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  }}
                >
                  <input
                    type="color"
                    value={selectedColor.startsWith('#') && selectedColor.length === 7 ? selectedColor : '#000000'}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/80 shadow-xs pointer-events-none group-hover:scale-110 transition-transform" />
                </label>

                {/* Hex Code Input Box */}
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                    Hex Code
                  </span>
                  <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#E5E5EA] focus-within:border-black focus-within:ring-1 focus-within:ring-black">
                    <span className="text-xs font-mono text-zinc-400 font-bold">#</span>
                    <input
                      type="text"
                      value={selectedColor.replace(/^#/, '').toUpperCase()}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                        if (val.length === 6) {
                          setColor(`#${val}`);
                        } else if (val.length === 3) {
                          const expanded = val.split('').map(c => c + c).join('');
                          setColor(`#${expanded}`);
                        }
                      }}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-transparent font-mono text-xs font-bold text-black focus:outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* 16 Core Colors Grid */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                  <span>Core Palette</span>
                  <span>16 Colors</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-[#F7F7FA] border border-[#E5E5EA]">
                  {[
                    '#18181B', '#3F3F46', '#71717A', '#A1A1AA', '#D4D4D8', '#FFFFFF', '#EF4444', '#F97316',
                    '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#78350F',
                  ].map((color) => {
                    const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
                    return (
                      <button
                        key={color}
                        onClick={() => setColor(color)}
                        style={{ backgroundColor: color }}
                        title={color}
                        className={`relative w-6 h-6 rounded-lg transition-all hover:scale-115 focus:outline-none border border-black/15 shadow-2xs ${
                          isSelected ? 'ring-2 ring-black ring-offset-1 ring-offset-white z-10 scale-105' : ''
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 mx-auto text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Colors Strip */}
              {recentColors.length > 0 && (
                <div className="pt-2 border-t border-zinc-200">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    <History className="w-3 h-3 text-zinc-400" />
                    <span>Recent Colors</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-xl bg-[#F7F7FA] border border-[#E5E5EA] scrollbar-thin scrollbar-thumb-zinc-300">
                    {recentColors.map((rc, idx) => {
                      const isSelected = selectedColor.toLowerCase() === rc.toLowerCase();
                      return (
                        <button
                          key={`recent-${rc}-${idx}`}
                          onClick={() => setColor(rc)}
                          style={{ backgroundColor: rc }}
                          title={rc}
                          className={`w-5 h-5 rounded-md border border-black/15 shadow-2xs flex-shrink-0 transition-all hover:scale-115 ${
                            isSelected ? 'ring-2 ring-black ring-offset-1 ring-offset-white z-10 scale-105' : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Canvas Background Popover */}
        <div className="relative" ref={bgRef}>
          <button
            onClick={() => setIsBgOpen(!isBgOpen)}
            title="Canvas Background"
            aria-label="Canvas Background"
            className="flex items-center justify-center min-w-[34px] min-h-[34px] w-8 h-8 md:w-8.5 md:h-8.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Compact Dropdown Flyout Panel */}
          {isBgOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 md:translate-x-0 md:left-full bottom-full md:bottom-0 md:top-auto mb-3 md:mb-0 md:ml-3 w-48 p-2.5 rounded-2xl bg-white border border-[#E5E5EA] shadow-xl z-50 text-[#18181B] animate-in fade-in zoom-in-95 duration-150">
              <span className="block text-xs font-bold text-[#18181B] pb-1 mb-1.5 border-b border-[#E5E5EA]">
                Background
              </span>
              <div className="space-y-1">
                {[
                  { id: '#ffffff', label: 'White', preview: 'bg-white' },
                  { id: 'transparent', label: 'Transparent', preview: 'bg-[radial-gradient(#e5e5ea_1px,transparent_1px)] [background-size:6px_6px]' },
                  { id: '#000000', label: 'Black', preview: 'bg-black' },
                  { id: '#1e1b4b', label: 'Midnight Blue', preview: 'bg-indigo-950' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setCanvasBgColor(b.id === 'transparent' ? null : b.id);
                      setIsBgOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      (b.id === 'transparent' && !canvasBgColor) || canvasBgColor === b.id
                        ? 'bg-black text-white font-bold'
                        : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-3.5 h-3.5 rounded border border-[#E5E5EA] ${b.preview}`} />
                      <span>{b.label}</span>
                    </div>
                    {((b.id === 'transparent' && !canvasBgColor) || canvasBgColor === b.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
