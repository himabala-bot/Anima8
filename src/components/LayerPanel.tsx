import React, { useState } from 'react';
import { useStudioStore, Layer } from '../store/useStudioStore';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Edit2,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

interface LayerThumbnailProps {
  dataUrl: string | null;
  name: string;
}

const LayerThumbnail: React.FC<LayerThumbnailProps> = ({ dataUrl, name }) => {
  return (
    <div
      className="relative w-11 h-8 rounded-lg overflow-hidden border border-[#D4D4D8] bg-white flex-shrink-0 flex items-center justify-center shadow-2xs"
      style={{
        backgroundImage: `
          linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
          linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
          linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
        `,
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
      }}
      title={`${name} preview`}
    >
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={name}
          className="w-full h-full object-contain pointer-events-none"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-zinc-300">
          <ImageIcon className="w-3.5 h-3.5 opacity-60" />
        </div>
      )}
    </div>
  );
};

export const LayerPanel: React.FC<{ className?: string }> = ({ className = '' }) => {
  const frames = useStudioStore((state) => state.frames);
  const activeFrameIndex = useStudioStore((state) => state.activeFrameIndex);
  const activeLayerId = useStudioStore((state) => state.activeLayerId);

  const setActiveLayerId = useStudioStore((state) => state.setActiveLayerId);
  const addLayer = useStudioStore((state) => state.addLayer);
  const duplicateLayer = useStudioStore((state) => state.duplicateLayer);
  const deleteLayer = useStudioStore((state) => state.deleteLayer);
  const reorderLayers = useStudioStore((state) => state.reorderLayers);
  const toggleLayerVisibility = useStudioStore((state) => state.toggleLayerVisibility);
  const toggleLayerLock = useStudioStore((state) => state.toggleLayerLock);
  const setLayerOpacity = useStudioStore((state) => state.setLayerOpacity);
  const renameLayer = useStudioStore((state) => state.renameLayer);

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const currentFrame = frames[activeFrameIndex];
  if (!currentFrame) return null;

  // Display top layer first (reversed array for rendering)
  const layers = currentFrame.layers;

  const handleStartRename = (layer: Layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleSaveRename = (layerId: string) => {
    if (editingName.trim()) {
      renameLayer(layerId, editingName.trim());
    }
    setEditingLayerId(null);
  };

  return (
    <div
      className={`flex flex-col rounded-3xl bg-white border border-[#E5E5EA] shadow-xl shadow-zinc-200/50 p-3 select-none w-72 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E5EA]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-black text-white">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#18181B]">Layers</h3>
            <span className="text-[10px] text-[#71717A]">
              Frame #{activeFrameIndex + 1} ({layers.length} {layers.length === 1 ? 'layer' : 'layers'})
            </span>
          </div>
        </div>

        <button
          onClick={addLayer}
          title="Add New Layer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Layer List (Top layer drawn on top) */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-300">
        {[...layers].reverse().map((layer, reverseIdx) => {
          const actualIndex = layers.length - 1 - reverseIdx;
          const isActive = layer.id === activeLayerId;
          const isEditing = editingLayerId === layer.id;

          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayerId(layer.id)}
              className={`flex flex-col p-2 rounded-2xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-50 border-black shadow-xs ring-1 ring-black'
                  : 'bg-[#F7F7FA] border-[#E5E5EA] hover:bg-white hover:border-[#D4D4D8]'
              }`}
            >
              {/* Row 1: Preview Thumbnail, Name, Controls */}
              <div className="flex items-center gap-2">
                {/* 1. Clear Layer Thumbnail Preview */}
                <LayerThumbnail dataUrl={layer.dataUrl} name={layer.name} />

                {/* 2. Layer Name & Inline Rename */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveRename(layer.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(layer.id)}
                        autoFocus
                        className="w-full px-1.5 py-0.5 rounded border border-black text-xs font-semibold text-[#18181B] bg-white focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(layer.id)}
                        className="p-1 rounded bg-black text-white"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <span
                        onDoubleClick={() => handleStartRename(layer)}
                        title="Double-click to rename"
                        className={`text-xs truncate block font-medium ${
                          isActive ? 'text-black font-bold' : 'text-[#18181B]'
                        }`}
                      >
                        {layer.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(layer);
                        }}
                        title="Rename Layer"
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-black transition-opacity"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Visibility & Lock Toggle */}
                <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleLayerVisibility(layer.id)}
                    title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    className={`p-1 rounded-lg transition-colors ${
                      layer.visible
                        ? 'text-black hover:bg-zinc-200'
                        : 'text-zinc-400 hover:bg-zinc-200'
                    }`}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>

                  <button
                    onClick={() => toggleLayerLock(layer.id)}
                    title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    className={`p-1 rounded-lg transition-colors ${
                      layer.locked
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-zinc-400 hover:text-black hover:bg-zinc-200'
                    }`}
                  >
                    {layer.locked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Row 2: Layer Action Buttons (Reorder, Copy, Delete Layer) */}
              <div
                className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-zinc-200/80 text-[10px] text-zinc-500"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Reorder Up/Down */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => reorderLayers(actualIndex, actualIndex + 1)}
                    disabled={actualIndex >= layers.length - 1}
                    title="Move Layer Up"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-zinc-600 hover:text-black disabled:opacity-20 hover:bg-zinc-200 transition-colors"
                  >
                    <ChevronUp className="w-3 h-3" />
                    <span>Up</span>
                  </button>
                  <button
                    onClick={() => reorderLayers(actualIndex, actualIndex - 1)}
                    disabled={actualIndex <= 0}
                    title="Move Layer Down"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-zinc-600 hover:text-black disabled:opacity-20 hover:bg-zinc-200 transition-colors"
                  >
                    <ChevronDown className="w-3 h-3" />
                    <span>Down</span>
                  </button>
                </div>

                {/* Duplicate & Delete Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateLayer(layer.id)}
                    title="Duplicate Layer"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-zinc-600 hover:text-black hover:bg-zinc-200 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={() => deleteLayer(layer.id)}
                    title={layers.length <= 1 ? "Clear/Reset Layer" : "Delete Layer"}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-rose-600 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Opacity Slider (When Layer Active) */}
              {isActive && (
                <div
                  className="mt-1.5 pt-1.5 border-t border-zinc-200 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-semibold text-zinc-600">
                    Opacity: {Math.round(layer.opacity * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(layer.opacity * 100)}
                    onChange={(e) =>
                      setLayerOpacity(layer.id, Number(e.target.value) / 100)
                    }
                    className="w-28 h-1 bg-[#E5E5EA] rounded appearance-none cursor-pointer accent-black"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
