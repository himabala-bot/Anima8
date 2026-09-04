import { create } from 'zustand';
import { projectRepository } from '../repositories/projectRepository';
import { ProjectRecord } from '../utils/indexedDB';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0.0 to 1.0
  dataUrl: string | null;
}

export interface Frame {
  id: string;
  exposure: number; // Duration in ticks/frames (default: 1)
  layers: Layer[];
}

export type ToolType =
  | 'brush'
  | 'eraser'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'bucket'
  | 'picker'
  | 'select'
  | 'hand';

export type BrushPresetType = 'pencil' | 'ink' | 'marker' | 'soft' | 'hard';
export type ShapeType = 'rectangle' | 'circle';

export interface SelectionState {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  dataUrl: string | null;
}

export interface ReferenceImageState {
  visible: boolean;
  opacity: number; // 0.0 to 1.0
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  dataUrl: string | null;
}

export interface AudioTrackState {
  name: string;
  dataUrl: string;
  duration: number; // in seconds
  offset: number; // start offset in seconds
  muted: boolean;
  volume: number; // 0.0 to 1.0
}

export interface ColorPalette {
  name: string;
  colors: string[];
}

export const PRESET_PALETTES: ColorPalette[] = [
  {
    name: 'Modern Studio',
    colors: [
      '#18181B', '#3F3F46', '#71717A', '#A1A1AA',
      '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
      '#EF4444', '#F97316', '#F59E0B', '#10B981',
      '#06B6D4', '#3B82F6', '#64748B', '#FFFFFF',
    ],
  },
  {
    name: 'Anime & Manga',
    colors: [
      '#1a1c23', '#2d3748', '#4a5568', '#718096',
      '#f687b3', '#d53f8c', '#9f7aea', '#6b46c1',
      '#4299e1', '#2b6cb0', '#38b2ac', '#48bb78',
      '#ecc94b', '#ed8936', '#fbd38d', '#ffffff',
    ],
  },
  {
    name: 'Pastel Dreams',
    colors: [
      '#FDE2E4', '#FFCAD4', '#B5E2FA', '#C5DEDD',
      '#E2ECE9', '#DFE7FD', '#CDDAFD', '#D8B4E2',
      '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7',
      '#C7CEEA', '#9B5DE5', '#F15BB5', '#FEE440',
    ],
  },
  {
    name: 'Warm Sunset',
    colors: [
      '#1B1947', '#392B58', '#683A68', '#A04D6E',
      '#D46468', '#F28E67', '#F8B96C', '#FCE184',
      '#264653', '#2A9D8F', '#E9C46A', '#F4A261',
      '#E76F51', '#FFFFFF', '#22223B', '#4A4E69',
    ],
  },
  {
    name: 'Monochrome',
    colors: [
      '#000000', '#18181B', '#27272A', '#3F3F46',
      '#52525B', '#71717A', '#A1A1AA', '#D4D4D8',
      '#E4E4E7', '#F4F4F5', '#FAFAFA', '#FFFFFF',
    ],
  },
];

export const createDefaultLayer = (name = 'Layer 1'): Layer => ({
  id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  name,
  visible: true,
  locked: false,
  opacity: 1.0,
  dataUrl: null,
});

export const createEmptyFrame = (): Frame => ({
  id: `frame_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  exposure: 1,
  layers: [createDefaultLayer('Layer 1')],
});

const MAX_HISTORY = 25;

export interface StudioState {
  projectId: string;
  projectName: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string | null;
  saveStatus: 'saved' | 'saving' | 'error';

  // Brush & Tool settings
  brushPreset: BrushPresetType;
  brushSize: number; // 1 to 150 px
  brushOpacity: number; // 0.05 to 1.0
  eraserSize: number; // 1 to 150 px
  activeTool: ToolType;
  shapeType: ShapeType;
  shapeFill: boolean;

  // Selection & Transform state
  selection: SelectionState | null;

  // Reference Image Layer
  referenceImage: ReferenceImageState | null;

  // Audio Track
  audioTrack: AudioTrackState | null;

  // Animation timeline settings
  fps: number;
  activeFrameIndex: number;
  activeLayerId: string;
  selectedFrameIndices: number[];
  copiedFrames: Frame[] | null;
  frames: Frame[];
  isPlaying: boolean;
  isLooping: boolean;

  // Visual aids
  onionSkin: boolean;
  onionSkinOpacity: number;
  onionSkinMode: 'prev' | 'both';
  showGrid: boolean;
  zoom: number;

  // Color & Palettes
  selectedColor: string;
  palette: string[];
  activePaletteName: string;
  recentColors: string[];

  // History Stacks
  past: Frame[][];
  future: Frame[][];

  // Actions
  setProjectName: (name: string) => void;
  setCanvasDimensions: (width: number, height: number) => void;
  setCanvasBgColor: (color: string | null) => void;

  // Brush & Eraser actions
  setBrushPreset: (preset: BrushPresetType) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setEraserSize: (size: number) => void;
  setTool: (tool: ToolType) => void;
  setShapeType: (shape: ShapeType) => void;
  setShapeFill: (fill: boolean) => void;
  setColor: (color: string) => void;
  addRecentColor: (color: string) => void;
  setPalette: (paletteName: string) => void;

  // Layer actions
  setActiveLayerId: (id: string) => void;
  addLayer: () => void;
  duplicateLayer: (layerId: string) => void;
  deleteLayer: (layerId: string) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  renameLayer: (layerId: string, name: string) => void;
  commitLayerData: (layerId: string, dataUrl: string | null, isStroke?: boolean) => void;

  // Selection actions
  setSelection: (selection: SelectionState | null) => void;
  applySelectionTransform: (x: number, y: number, width: number, height: number, rotation: number) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: (offset?: { dx?: number; dy?: number }) => void;
  duplicateSelection: () => void;
  clearSelection: () => void;
  deleteSelection: () => void;
  copiedSelection: SelectionState | null;

  // Reference Image & Audio
  setReferenceImage: (ref: ReferenceImageState | null) => void;
  setAudioTrack: (audio: AudioTrackState | null) => void;

  // Animation timeline actions
  addFrame: (insertAfterIndex?: number) => void;
  duplicateFrame: (index: number) => void;
  deleteFrame: (index: number) => void;
  reorderFrames: (startIndex: number, endIndex: number) => void;
  setActiveFrame: (index: number) => void;
  setFrameExposure: (index: number, exposure: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;

  // Multi-frame operations
  toggleFrameSelection: (index: number, isMulti: boolean) => void;
  selectAllFrames: () => void;
  clearFrameSelection: () => void;
  duplicateSelectedFrames: () => void;
  deleteSelectedFrames: () => void;
  copySelectedFrames: () => void;
  pasteFrames: () => void;

  // Playback & view actions
  setFps: (fps: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLooping: (looping: boolean) => void;
  setOnionSkin: (enabled: boolean) => void;
  setOnionSkinOpacity: (opacity: number) => void;
  setOnionSkinMode: (mode: 'prev' | 'both') => void;
  setShowGrid: (enabled: boolean) => void;
  setZoom: (zoom: number) => void;

  // History & project actions
  undo: () => void;
  redo: () => void;
  clearCurrentFrame: () => void;
  resetStudio: () => void;
  loadProject: (project: ProjectRecord) => void;
  loadProjectById: (id: string) => Promise<boolean>;
  createNewProject: (name: string, width: number, height: number, bgColor?: string | null, fps?: number) => Promise<string>;
  saveToStorage: (immediate?: boolean) => void;
}

const initialFrame = createEmptyFrame();

let debounceSaveTimer: any = null;

export const useStudioStore = create<StudioState>((set, get) => ({
  projectId: `proj_${Date.now()}`,
  projectName: 'Untitled Animation',
  canvasWidth: 1280,
  canvasHeight: 720,
  canvasBgColor: '#ffffff',
  saveStatus: 'saved',

  brushPreset: 'ink',
  brushSize: 8,
  brushOpacity: 1.0,
  eraserSize: 24,
  activeTool: 'brush',
  shapeType: 'rectangle',
  shapeFill: false,

  selection: null,
  copiedSelection: null,
  referenceImage: null,
  audioTrack: null,

  fps: 12,
  activeFrameIndex: 0,
  activeLayerId: initialFrame.layers[0].id,
  selectedFrameIndices: [0],
  copiedFrames: null,
  frames: [initialFrame],
  isPlaying: false,
  isLooping: true,

  onionSkin: true,
  onionSkinOpacity: 0.35,
  onionSkinMode: 'prev',
  showGrid: false,
  zoom: 100,

  selectedColor: '#18181B',
  palette: PRESET_PALETTES[0].colors,
  activePaletteName: PRESET_PALETTES[0].name,
  recentColors: ['#18181B', '#6366F1', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#FFFFFF'],

  past: [],
  future: [],

  setProjectName: (name: string) => {
    set({ projectName: name });
    get().saveToStorage();
  },

  setCanvasDimensions: (width: number, height: number) => {
    const clampedW = Math.max(200, Math.min(3840, Math.round(width)));
    const clampedH = Math.max(200, Math.min(3840, Math.round(height)));
    set({ canvasWidth: clampedW, canvasHeight: clampedH });
    get().saveToStorage();
  },

  setCanvasBgColor: (color: string | null) => {
    set({ canvasBgColor: color });
    get().saveToStorage();
  },
  setBrushPreset: (preset: BrushPresetType) => {
    const config = {
      pencil: { size: 2.5, opacity: 0.45 },
      ink: { size: 6, opacity: 1.0 },
      marker: { size: 24, opacity: 0.45 },
      soft: { size: 32, opacity: 0.35 },
      hard: { size: 12, opacity: 1.0 },
    }[preset];

    set({
      brushPreset: preset,
      brushSize: config.size,
      brushOpacity: config.opacity,
      activeTool: 'brush',
    });
  },

  setBrushSize: (size: number) => {
    set({ brushSize: Math.max(1, Math.min(150, Math.round(size))) });
  },

  setBrushOpacity: (opacity: number) => {
    set({ brushOpacity: Math.max(0.05, Math.min(1.0, opacity)) });
  },

  setEraserSize: (size: number) => {
    set({ eraserSize: Math.max(1, Math.min(150, Math.round(size))) });
  },

  setTool: (tool: ToolType) => {
    if (tool !== 'select') {
      set({ activeTool: tool, selection: null });
    } else {
      set({ activeTool: tool });
    }
  },

  setShapeType: (shape: ShapeType) => {
    set({ shapeType: shape, activeTool: shape });
  },

  setShapeFill: (fill: boolean) => {
    set({ shapeFill: fill });
  },

  setColor: (color: string) => {
    set({ selectedColor: color });
    get().addRecentColor(color);
  },

  addRecentColor: (color: string) => {
    const { recentColors } = get();
    const filtered = recentColors.filter((c) => c.toLowerCase() !== color.toLowerCase());
    set({ recentColors: [color, ...filtered].slice(0, 12) });
  },

  setPalette: (paletteName: string) => {
    const found = PRESET_PALETTES.find((p) => p.name === paletteName);
    if (found) {
      set({
        palette: found.colors,
        activePaletteName: found.name,
        selectedColor: found.colors[0],
      });
    }
  },

  // Layer Actions
  setActiveLayerId: (id: string) => {
    set({ activeLayerId: id });
  },

  addLayer: () => {
    const { frames, activeFrameIndex, activeLayerId, past } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const layerIndex = currentFrame.layers.findIndex((l) => l.id === activeLayerId);
    const newLayer = createDefaultLayer(`Layer ${currentFrame.layers.length + 1}`);

    const updatedLayers = [...currentFrame.layers];
    const insertPos = layerIndex >= 0 ? layerIndex + 1 : updatedLayers.length;
    updatedLayers.splice(insertPos, 0, newLayer);

    const updatedFrames = frames.map((f, idx) =>
      idx === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeLayerId: newLayer.id,
    });
    get().saveToStorage();
  },

  duplicateLayer: (layerId: string) => {
    const { frames, activeFrameIndex, past } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const layerToDup = currentFrame.layers.find((l) => l.id === layerId);
    if (!layerToDup) return;

    const dupLayer: Layer = {
      ...layerToDup,
      id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${layerToDup.name} Copy`,
    };

    const idx = currentFrame.layers.findIndex((l) => l.id === layerId);
    const updatedLayers = [...currentFrame.layers];
    updatedLayers.splice(idx + 1, 0, dupLayer);

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeLayerId: dupLayer.id,
    });
    get().saveToStorage();
  },

  deleteLayer: (layerId: string) => {
    const { frames, activeFrameIndex, past } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    let updatedLayers = currentFrame.layers.filter((l) => l.id !== layerId);
    if (updatedLayers.length === 0) {
      const freshLayer = createDefaultLayer('Layer 1');
      updatedLayers = [freshLayer];
    }
    const nextActiveLayerId = updatedLayers[updatedLayers.length - 1].id;

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeLayerId: nextActiveLayerId,
    });
    get().saveToStorage();
  },

  reorderLayers: (startIndex: number, endIndex: number) => {
    const { frames, activeFrameIndex, past } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const updatedLayers = [...currentFrame.layers];
    const [moved] = updatedLayers.splice(startIndex, 1);
    updatedLayers.splice(endIndex, 0, moved);

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
    });
    get().saveToStorage();
  },

  toggleLayerVisibility: (layerId: string) => {
    const { frames, activeFrameIndex } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const updatedLayers = currentFrame.layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    );

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({ frames: updatedFrames });
    get().saveToStorage();
  },

  toggleLayerLock: (layerId: string) => {
    const { frames, activeFrameIndex } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const updatedLayers = currentFrame.layers.map((l) =>
      l.id === layerId ? { ...l, locked: !l.locked } : l
    );

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({ frames: updatedFrames });
  },

  setLayerOpacity: (layerId: string, opacity: number) => {
    const { frames, activeFrameIndex } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const updatedLayers = currentFrame.layers.map((l) =>
      l.id === layerId ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
    );

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({ frames: updatedFrames });
    get().saveToStorage();
  },

  renameLayer: (layerId: string, name: string) => {
    const { frames, activeFrameIndex } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const updatedLayers = currentFrame.layers.map((l) =>
      l.id === layerId ? { ...l, name } : l
    );

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({ frames: updatedFrames });
    get().saveToStorage();
  },

  /**
   * Commit layer data & immediately persist stroke
   */
  commitLayerData: (layerId: string, dataUrl: string | null, isStroke = true) => {
    const { frames, activeFrameIndex, past } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const updatedLayers = currentFrame.layers.map((l) =>
      l.id === layerId ? { ...l, dataUrl } : l
    );

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
    });

    // Level 1: Immediate stroke durability
    get().saveToStorage(isStroke);
  },

  // Selection & Transform Actions
  setSelection: (selection: SelectionState | null) => {
    set({ selection });
  },

  applySelectionTransform: (x: number, y: number, width: number, height: number, rotation: number) => {
    const { selection } = get();
    if (!selection) return;

    set({
      selection: {
        ...selection,
        x,
        y,
        width,
        height,
        rotation,
      },
    });
  },

  copySelection: () => {
    const { selection } = get();
    if (!selection) return;
    set({ copiedSelection: { ...selection } });
  },

  cutSelection: () => {
    const { selection } = get();
    if (!selection) return;
    set({ copiedSelection: { ...selection }, selection: null });
  },

  pasteSelection: (offset?: { dx?: number; dy?: number }) => {
    const { copiedSelection, canvasWidth, canvasHeight, selection } = get();
    if (!copiedSelection || !copiedSelection.dataUrl) return;

    // Use current active selection position if present, otherwise copiedSelection position
    const baseX = selection ? selection.x : copiedSelection.x;
    const baseY = selection ? selection.y : copiedSelection.y;

    const dx = offset?.dx ?? 36;
    const dy = offset?.dy ?? 36;

    let nextX = baseX + dx;
    let nextY = baseY + dy;

    // If offset places it off the right or bottom canvas edges, place to the other side
    if (nextX + (copiedSelection.width || 40) > canvasWidth) {
      nextX = Math.max(12, baseX - dx);
    }
    if (nextY + (copiedSelection.height || 40) > canvasHeight) {
      nextY = Math.max(12, baseY - dy);
    }

    const newSelection: SelectionState = {
      ...copiedSelection,
      x: nextX,
      y: nextY,
      active: true,
    };

    set({
      selection: newSelection,
      activeTool: 'select',
    });
  },

  duplicateSelection: () => {
    const { selection, canvasWidth, canvasHeight } = get();
    if (!selection) return;

    let nextX = selection.x + 36;
    let nextY = selection.y + 36;

    if (nextX + selection.width > canvasWidth) {
      nextX = Math.max(12, selection.x - 36);
    }
    if (nextY + selection.height > canvasHeight) {
      nextY = Math.max(12, selection.y - 36);
    }

    set({
      selection: {
        ...selection,
        x: nextX,
        y: nextY,
      },
    });
  },

  clearSelection: () => {
    set({ selection: null });
  },

  deleteSelection: () => {
    set({ selection: null });
  },

  // Reference Image & Audio
  setReferenceImage: (ref: ReferenceImageState | null) => {
    set({ referenceImage: ref });
    get().saveToStorage();
  },

  setAudioTrack: (audio: AudioTrackState | null) => {
    set({ audioTrack: audio });
    get().saveToStorage();
  },

  // Animation timeline actions
  addFrame: (insertAfterIndex?: number) => {
    const { frames, activeFrameIndex, past } = get();
    const targetIdx = typeof insertAfterIndex === 'number' ? insertAfterIndex : activeFrameIndex;

    const newFrame = createEmptyFrame();
    const updatedFrames = [
      ...frames.slice(0, targetIdx + 1),
      newFrame,
      ...frames.slice(targetIdx + 1),
    ];

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeFrameIndex: targetIdx + 1,
      activeLayerId: newFrame.layers[0].id,
      selectedFrameIndices: [targetIdx + 1],
    });
    get().saveToStorage();
  },

  duplicateFrame: (index: number) => {
    const { frames, past } = get();
    const frameToDuplicate = frames[index];
    if (!frameToDuplicate) return;

    const duplicated: Frame = {
      id: `frame_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      exposure: frameToDuplicate.exposure,
      layers: frameToDuplicate.layers.map((l) => ({
        ...l,
        id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      })),
    };

    const updatedFrames = [
      ...frames.slice(0, index + 1),
      duplicated,
      ...frames.slice(index + 1),
    ];

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeFrameIndex: index + 1,
      activeLayerId: duplicated.layers[0].id,
      selectedFrameIndices: [index + 1],
    });
    get().saveToStorage();
  },

  deleteFrame: (index: number) => {
    const { frames, activeFrameIndex, past } = get();
    if (frames.length <= 1) return;

    const updatedFrames = frames.filter((_, idx) => idx !== index);
    let nextActiveIndex = activeFrameIndex;

    if (activeFrameIndex >= updatedFrames.length) {
      nextActiveIndex = updatedFrames.length - 1;
    } else if (index < activeFrameIndex) {
      nextActiveIndex = activeFrameIndex - 1;
    }

    const nextActiveLayerId = updatedFrames[nextActiveIndex].layers[0].id;

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeFrameIndex: nextActiveIndex,
      activeLayerId: nextActiveLayerId,
      selectedFrameIndices: [nextActiveIndex],
    });
    get().saveToStorage();
  },

  reorderFrames: (startIndex: number, endIndex: number) => {
    const { frames, activeFrameIndex, past } = get();
    if (startIndex === endIndex || startIndex < 0 || startIndex >= frames.length || endIndex < 0 || endIndex >= frames.length) {
      return;
    }

    const updated = [...frames];
    const [moved] = updated.splice(startIndex, 1);
    updated.splice(endIndex, 0, moved);

    let nextActive = activeFrameIndex;
    if (activeFrameIndex === startIndex) {
      nextActive = endIndex;
    } else if (startIndex < activeFrameIndex && endIndex >= activeFrameIndex) {
      nextActive = activeFrameIndex - 1;
    } else if (startIndex > activeFrameIndex && endIndex <= activeFrameIndex) {
      nextActive = activeFrameIndex + 1;
    }

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updated,
      activeFrameIndex: nextActive,
      selectedFrameIndices: [nextActive],
    });
    get().saveToStorage();
  },

  setActiveFrame: (index: number) => {
    const { frames } = get();
    if (index >= 0 && index < frames.length) {
      const frame = frames[index];
      const existingLayer = frame.layers.find((l) => l.id === get().activeLayerId);
      const nextLayerId = existingLayer ? existingLayer.id : frame.layers[0].id;

      set({
        activeFrameIndex: index,
        activeLayerId: nextLayerId,
        selectedFrameIndices: [index],
      });
    }
  },

  setFrameExposure: (index: number, exposure: number) => {
    const { frames, past } = get();
    const clampedExposure = Math.max(1, Math.min(24, Math.round(exposure)));

    const updatedFrames = frames.map((f, i) =>
      i === index ? { ...f, exposure: clampedExposure } : f
    );

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
    });
    get().saveToStorage();
  },

  nextFrame: () => {
    const { frames, activeFrameIndex, isLooping } = get();
    if (frames.length <= 1) return;
    if (activeFrameIndex < frames.length - 1) {
      get().setActiveFrame(activeFrameIndex + 1);
    } else if (isLooping) {
      get().setActiveFrame(0);
    }
  },

  prevFrame: () => {
    const { frames, activeFrameIndex, isLooping } = get();
    if (frames.length <= 1) return;
    if (activeFrameIndex > 0) {
      get().setActiveFrame(activeFrameIndex - 1);
    } else if (isLooping) {
      get().setActiveFrame(frames.length - 1);
    }
  },

  // Multi-frame operations
  toggleFrameSelection: (index: number, isMulti: boolean) => {
    const { selectedFrameIndices } = get();
    if (!isMulti) {
      get().setActiveFrame(index);
      return;
    }

    if (selectedFrameIndices.includes(index)) {
      if (selectedFrameIndices.length > 1) {
        set({ selectedFrameIndices: selectedFrameIndices.filter((i) => i !== index) });
      }
    } else {
      set({ selectedFrameIndices: [...selectedFrameIndices, index].sort((a, b) => a - b) });
    }
  },

  selectAllFrames: () => {
    const { frames } = get();
    set({ selectedFrameIndices: frames.map((_, i) => i) });
  },

  clearFrameSelection: () => {
    const { activeFrameIndex } = get();
    set({ selectedFrameIndices: [activeFrameIndex] });
  },

  duplicateSelectedFrames: () => {
    const { frames, selectedFrameIndices, past } = get();
    if (selectedFrameIndices.length === 0) return;

    const duplicates: Frame[] = selectedFrameIndices.map((idx) => {
      const orig = frames[idx];
      return {
        id: `frame_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        exposure: orig.exposure,
        layers: orig.layers.map((l) => ({
          ...l,
          id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        })),
      };
    });

    const maxIdx = Math.max(...selectedFrameIndices);
    const updatedFrames = [
      ...frames.slice(0, maxIdx + 1),
      ...duplicates,
      ...frames.slice(maxIdx + 1),
    ];

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeFrameIndex: maxIdx + 1,
      selectedFrameIndices: duplicates.map((_, i) => maxIdx + 1 + i),
    });
    get().saveToStorage();
  },

  deleteSelectedFrames: () => {
    const { frames, selectedFrameIndices, past } = get();
    if (frames.length <= selectedFrameIndices.length) return;

    const updatedFrames = frames.filter((_, idx) => !selectedFrameIndices.includes(idx));
    const nextActive = Math.min(get().activeFrameIndex, updatedFrames.length - 1);

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeFrameIndex: Math.max(0, nextActive),
      selectedFrameIndices: [Math.max(0, nextActive)],
    });
    get().saveToStorage();
  },

  copySelectedFrames: () => {
    const { frames, selectedFrameIndices } = get();
    const copied = selectedFrameIndices.map((idx) => frames[idx]);
    set({ copiedFrames: copied });
  },

  pasteFrames: () => {
    const { frames, copiedFrames, activeFrameIndex, past } = get();
    if (!copiedFrames || copiedFrames.length === 0) return;

    const pasted: Frame[] = copiedFrames.map((f) => ({
      id: `frame_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      exposure: f.exposure,
      layers: f.layers.map((l) => ({
        ...l,
        id: `layer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      })),
    }));

    const updatedFrames = [
      ...frames.slice(0, activeFrameIndex + 1),
      ...pasted,
      ...frames.slice(activeFrameIndex + 1),
    ];

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
      activeFrameIndex: activeFrameIndex + 1,
      selectedFrameIndices: pasted.map((_, i) => activeFrameIndex + 1 + i),
    });
    get().saveToStorage();
  },

  setFps: (fps: number) => {
    set({ fps: Math.max(1, Math.min(24, Math.round(fps))) });
    get().saveToStorage();
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setIsLooping: (looping: boolean) => {
    set({ isLooping: looping });
  },

  setOnionSkin: (enabled: boolean) => {
    set({ onionSkin: enabled });
  },

  setOnionSkinOpacity: (opacity: number) => {
    set({ onionSkinOpacity: Math.max(0.05, Math.min(1.0, opacity)) });
  },

  setOnionSkinMode: (mode: 'prev' | 'both') => {
    set({ onionSkinMode: mode });
  },

  setShowGrid: (enabled: boolean) => {
    set({ showGrid: enabled });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(25, Math.min(1200, zoom)) });
  },

  undo: () => {
    const { past, frames, future } = get();
    if (past.length === 0) return;

    const previousFrames = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    const newFuture = [frames, ...future.slice(0, MAX_HISTORY - 1)];

    const currentActiveIndex = get().activeFrameIndex;
    const nextActiveIndex = Math.min(currentActiveIndex, previousFrames.length - 1);
    const nextLayerId = previousFrames[nextActiveIndex].layers[0].id;

    set({
      past: newPast,
      future: newFuture,
      frames: previousFrames,
      activeFrameIndex: Math.max(0, nextActiveIndex),
      activeLayerId: nextLayerId,
    });
    get().saveToStorage();
  },

  redo: () => {
    const { past, frames, future } = get();
    if (future.length === 0) return;

    const nextFrames = future[0];
    const newFuture = future.slice(1);
    const newPast = [...past.slice(-MAX_HISTORY + 1), frames];

    const currentActiveIndex = get().activeFrameIndex;
    const nextActiveIndex = Math.min(currentActiveIndex, nextFrames.length - 1);
    const nextLayerId = nextFrames[nextActiveIndex].layers[0].id;

    set({
      past: newPast,
      future: newFuture,
      frames: nextFrames,
      activeFrameIndex: Math.max(0, nextActiveIndex),
      activeLayerId: nextLayerId,
    });
    get().saveToStorage();
  },

  clearCurrentFrame: () => {
    const { frames, activeFrameIndex, activeLayerId, past } = get();
    const currentFrame = frames[activeFrameIndex];
    if (!currentFrame) return;

    const updatedLayers = currentFrame.layers.map((l) =>
      l.id === activeLayerId ? { ...l, dataUrl: null } : l
    );

    const updatedFrames = frames.map((f, i) =>
      i === activeFrameIndex ? { ...f, layers: updatedLayers } : f
    );

    set({
      past: [...past.slice(-MAX_HISTORY + 1), frames],
      future: [],
      frames: updatedFrames,
    });
    get().saveToStorage();
  },

  resetStudio: () => {
    const newFrame = createEmptyFrame();
    set({
      frames: [newFrame],
      activeFrameIndex: 0,
      activeLayerId: newFrame.layers[0].id,
      selectedFrameIndices: [0],
      past: [],
      future: [],
      isPlaying: false,
    });
    get().saveToStorage();
  },

  loadProject: (project: ProjectRecord) => {
    const sanitizedFrames: Frame[] = project.frames.map((f: any) => {
      if (f.layers && Array.isArray(f.layers)) {
        return f;
      }
      return {
        id: f.id || `frame_${Date.now()}`,
        exposure: f.exposure || 1,
        layers: [
          {
            id: `layer_${Date.now()}`,
            name: 'Layer 1',
            visible: true,
            locked: false,
            opacity: 1.0,
            dataUrl: f.dataUrl || null,
          },
        ],
      };
    });

    const activeFrame = sanitizedFrames[0];

    set({
      projectId: project.id,
      projectName: project.name,
      canvasWidth: project.canvasWidth || 1280,
      canvasHeight: project.canvasHeight || 720,
      canvasBgColor: project.canvasBgColor !== undefined ? project.canvasBgColor : '#ffffff',
      fps: project.fps || 12,
      frames: sanitizedFrames,
      audioTrack: project.audioTrack || null,
      referenceImage: project.referenceImage || null,
      activeFrameIndex: 0,
      activeLayerId: activeFrame.layers[0].id,
      selectedFrameIndices: [0],
      past: [],
      future: [],
      saveStatus: 'saved',
    });
  },

  loadProjectById: async (id: string): Promise<boolean> => {
    try {
      const proj = await projectRepository.getProjectById(id);
      if (proj) {
        get().loadProject(proj);
        return true;
      }
    } catch (e) {
      console.warn('Failed to load project from repository', e);
    }
    return false;
  },

  createNewProject: async (
    name: string,
    width = 1280,
    height = 720,
    bgColor: string | null = '#ffffff',
    fps = 12
  ): Promise<string> => {
    const newProject = await projectRepository.createProject(name, width, height, bgColor, fps);
    get().loadProject(newProject);
    return newProject.id;
  },

  /**
   * Persistence Engine:
   * immediate = true: Immediate stroke persistence
   * immediate = false: Debounced metadata persistence
   */
  saveToStorage: (immediate = false) => {
    if (typeof window === 'undefined') return;

    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }

    const executeSave = async () => {
      set({ saveStatus: 'saving' });
      const state = get();

      // Extract thumbnail preview from active frame's top visible layer or first layer
      const firstFrame = state.frames[0];
      const thumbData = firstFrame?.layers?.find((l) => l.dataUrl)?.dataUrl || null;

      const project: ProjectRecord = {
        id: state.projectId,
        name: state.projectName,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight,
        canvasBgColor: state.canvasBgColor,
        fps: state.fps,
        frames: state.frames,
        audioTrack: state.audioTrack,
        referenceImage: state.referenceImage,
        thumbnailDataUrl: thumbData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await projectRepository.saveProject(project);
        set({ saveStatus: 'saved' });
      } catch (e) {
        console.warn('Persistence error', e);
        set({ saveStatus: 'error' });
      }
    };

    if (immediate) {
      executeSave();
    } else {
      debounceSaveTimer = setTimeout(executeSave, 400);
    }
  },
}));
