import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useStudioStore, Frame, Layer } from '../store/useStudioStore';
import { canvasFloodFill } from '../utils/floodFill';
import { loadImage } from '../utils/videoExport';
import {
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Hand,
  Check,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Copy,
  ClipboardPaste,
  Scissors,
  X,
  Lock,
  Unlock,
  Move,
  Image as ImageIcon,
} from 'lucide-react';

interface CanvasProps {
  className?: string;
}

interface Point {
  x: number;
  y: number;
}

export const Canvas: React.FC<CanvasProps> = ({ className = '' }) => {
  const bottomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const topOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);

  // Store state
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const canvasBgColor = useStudioStore((state) => state.canvasBgColor);
  const activeFrameIndex = useStudioStore((state) => state.activeFrameIndex);
  const activeLayerId = useStudioStore((state) => state.activeLayerId);
  const frames = useStudioStore((state) => state.frames);
  const activeTool = useStudioStore((state) => state.activeTool);
  const shapeFill = useStudioStore((state) => state.shapeFill);
  const selectedColor = useStudioStore((state) => state.selectedColor);
  const brushSize = useStudioStore((state) => state.brushSize);
  const brushOpacity = useStudioStore((state) => state.brushOpacity);
  const eraserSize = useStudioStore((state) => state.eraserSize);
  const onionSkin = useStudioStore((state) => state.onionSkin);
  const onionSkinOpacity = useStudioStore((state) => state.onionSkinOpacity);
  const onionSkinMode = useStudioStore((state) => state.onionSkinMode);
  const showGrid = useStudioStore((state) => state.showGrid);
  const isPlaying = useStudioStore((state) => state.isPlaying);
  const zoom = useStudioStore((state) => state.zoom);
  const selection = useStudioStore((state) => state.selection);
  const referenceImage = useStudioStore((state) => state.referenceImage);
  const past = useStudioStore((state) => state.past);
  const future = useStudioStore((state) => state.future);

  // Store actions
  const commitLayerData = useStudioStore((state) => state.commitLayerData);
  const setColor = useStudioStore((state) => state.setColor);
  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const clearCurrentFrame = useStudioStore((state) => state.clearCurrentFrame);
  const setZoom = useStudioStore((state) => state.setZoom);
  const setSelection = useStudioStore((state) => state.setSelection);
  const clearSelection = useStudioStore((state) => state.clearSelection);
  const copySelection = useStudioStore((state) => state.copySelection);
  const cutSelection = useStudioStore((state) => state.cutSelection);
  const pasteSelection = useStudioStore((state) => state.pasteSelection);
  const copiedSelection = useStudioStore((state) => state.copiedSelection);
  const setReferenceImage = useStudioStore((state) => state.setReferenceImage);

  // Smooth Pan Offset (Transform Translate based - works in all directions infinitely)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; originX: number; originY: number }>({
    clientX: 0,
    clientY: 0,
    originX: 0,
    originY: 0,
  });
  const isSpacePressedRef = useRef<boolean>(false);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);

  // Multi-Touch Pinch-to-Zoom & Pan Tracking Refs
  const activePointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const isPinchZoomingRef = useRef<boolean>(false);
  const pinchStartRef = useRef<{
    distance: number;
    midpoint: { x: number; y: number };
    zoom: number;
    panOffset: { x: number; y: number };
  }>({
    distance: 0,
    midpoint: { x: 0, y: 0 },
    zoom: 100,
    panOffset: { x: 0, y: 0 },
  });
  const preStrokeDataUrlRef = useRef<string | null>(null);
  const ignoreSingleTouchUntilLiftRef = useRef<boolean>(false);

  // Reference Image Freeform Transform Mode
  const [isAdjustingReference, setIsAdjustingReference] = useState<boolean>(false);
  const isTransformingRefImageRef = useRef<boolean>(false);
  const refTransformTypeRef = useRef<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | null>(null);
  const refTransformStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    refX: number;
    refY: number;
    refW: number;
    refH: number;
  }>({ pointerX: 0, pointerY: 0, refX: 0, refY: 0, refW: 0, refH: 0 });

  // Drawing Interaction refs
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<Point | null>(null);
  const startPointRef = useRef<Point | null>(null);

  // Selection Transform Interaction Refs
  const isTransformingRef = useRef<boolean>(false);
  const transformTypeRef = useRef<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'rotate' | null>(null);
  const transformStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    selX: number;
    selY: number;
    selW: number;
    selH: number;
    selRot: number;
  }>({ pointerX: 0, pointerY: 0, selX: 0, selY: 0, selW: 0, selH: 0, selRot: 0 });

  const [hoverCoord, setHoverCoord] = useState<Point | null>(null);

  const activeFrame: Frame | undefined = frames[activeFrameIndex];
  const activeLayer: Layer | undefined = activeFrame?.layers.find((l) => l.id === activeLayerId);
  const prevFrame: Frame | undefined = activeFrameIndex > 0 ? frames[activeFrameIndex - 1] : undefined;
  const nextFrame: Frame | undefined = activeFrameIndex < frames.length - 1 ? frames[activeFrameIndex + 1] : undefined;

  // Viewport dimensions
  const baseDisplayWidth = 640;
  const aspectRatio = canvasWidth / canvasHeight;
  const displayWidth = Math.round(baseDisplayWidth * (zoom / 100));
  const displayHeight = Math.round(displayWidth / aspectRatio);

  const zoomPresets = [25, 50, 75, 100, 150, 200, 300, 400, 500, 800, 1000];

  /**
   * PREVENT WHOLE-PAGE BROWSER ZOOM ON 2-FINGER TRACKPAD PINCH
   */
  useEffect(() => {
    const container = workspaceContainerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rawDelta = -e.deltaY;
        const smoothFactor = Math.abs(rawDelta) > 50 ? 0.08 : 0.35;
        const delta = Math.round(rawDelta * smoothFactor);
        const currentZoom = useStudioStore.getState().zoom;
        const nextZoom = Math.max(25, Math.min(1200, currentZoom + delta));
        useStudioStore.getState().setZoom(nextZoom);
      }
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelEvent);
  }, []);

  // Coordinate mapper using getBoundingClientRect (matches zoom & panOffset seamlessly)
  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      const scaleX = canvasWidth / rect.width;
      const scaleY = canvasHeight / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      return {
        x: Math.max(0, Math.min(canvasWidth, x)),
        y: Math.max(0, Math.min(canvasHeight, y)),
      };
    },
    [canvasWidth, canvasHeight]
  );

  /**
   * Commit transformed selection back into active layer
   */
  const commitSelectionToLayer = useCallback(async () => {
    if (!selection || !selection.dataUrl) {
      clearSelection();
      return;
    }

    const drawCanvas = drawingCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    try {
      const img = await loadImage(selection.dataUrl);
      ctx.save();
      const cx = selection.x + selection.width / 2;
      const cy = selection.y + selection.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((selection.rotation * Math.PI) / 180);
      ctx.drawImage(
        img,
        -selection.width / 2,
        -selection.height / 2,
        selection.width,
        selection.height
      );
      ctx.restore();

      const dataUrl = drawCanvas.toDataURL('image/png');
      lastDrawnDataUrlRef.current = dataUrl;
      commitLayerData(activeLayerId, dataUrl);
    } catch {}

    clearSelection();
  }, [selection, activeLayerId, commitLayerData, clearSelection]);

  /**
   * Delete selection permanently
   */
  const deleteSelectionPermanently = useCallback(() => {
    const drawCanvas = drawingCanvasRef.current;
    if (drawCanvas) {
      const dataUrl = drawCanvas.toDataURL('image/png');
      lastDrawnDataUrlRef.current = dataUrl;
      commitLayerData(activeLayerId, dataUrl);
    }
    clearSelection();
  }, [activeLayerId, commitLayerData, clearSelection]);

  /**
   * Cancel selection
   */
  const cancelSelection = useCallback(async () => {
    if (!selection || !selection.dataUrl) {
      clearSelection();
      return;
    }

    const drawCanvas = drawingCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    try {
      const img = await loadImage(selection.dataUrl);
      ctx.save();
      ctx.drawImage(img, selection.x, selection.y, selection.width, selection.height);
      ctx.restore();

      const dataUrl = drawCanvas.toDataURL('image/png');
      lastDrawnDataUrlRef.current = dataUrl;
      commitLayerData(activeLayerId, dataUrl);
    } catch {}

    clearSelection();
  }, [selection, activeLayerId, commitLayerData, clearSelection]);

  /**
   * Handle pasting copied selection with clear offset beside original
   */
  const handlePaste = useCallback(async () => {
    if (!copiedSelection) return;
    if (selection) {
      await commitSelectionToLayer();
    }
    pasteSelection({ dx: 40, dy: 40 });
  }, [copiedSelection, selection, commitSelectionToLayer, pasteSelection]);

  /**
   * Duplicate selection (commits current selection and creates offset clone)
   */
  const duplicateSelection = useCallback(async () => {
    if (!selection) return;
    const current = { ...selection };
    await commitSelectionToLayer();
    let nextX = current.x + 40;
    let nextY = current.y + 40;
    if (nextX + current.width > canvasWidth) {
      nextX = Math.max(12, current.x - 40);
    }
    if (nextY + current.height > canvasHeight) {
      nextY = Math.max(12, current.y - 40);
    }
    setSelection({
      ...current,
      x: nextX,
      y: nextY,
    });
  }, [selection, commitSelectionToLayer, setSelection, canvasWidth, canvasHeight]);

  const adjustRotation = useCallback(
    (deltaDeg: number) => {
      if (!selection) return;
      setSelection({
        ...selection,
        rotation: (selection.rotation + deltaDeg) % 360,
      });
    },
    [selection, setSelection]
  );

  const flipSelectionHorizontal = useCallback(async () => {
    if (!selection || !selection.dataUrl) return;
    try {
      const img = await loadImage(selection.dataUrl);
      const flipCanvas = document.createElement('canvas');
      flipCanvas.width = selection.width;
      flipCanvas.height = selection.height;
      const fctx = flipCanvas.getContext('2d')!;
      fctx.translate(selection.width, 0);
      fctx.scale(-1, 1);
      fctx.drawImage(img, 0, 0, selection.width, selection.height);
      setSelection({
        ...selection,
        dataUrl: flipCanvas.toDataURL('image/png'),
      });
    } catch {}
  }, [selection, setSelection]);

  // Keyboard shortcut listener for canvas selection, tools, and transforms
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        isSpacePressedRef.current = true;
        setIsPanMode(true);
      }
      if (e.key === 'Enter' && selection) {
        commitSelectionToLayer();
      }
      if (e.key === 'Escape') {
        if (selection) cancelSelection();
        if (isAdjustingReference) setIsAdjustingReference(false);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection && !(e.target instanceof HTMLInputElement)) {
        deleteSelectionPermanently();
      }
      // Copy shortcut (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selection && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        copySelection();
      }
      // Cut shortcut (Ctrl+X / Cmd+X)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && selection && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        cutSelection();
      }
      // Paste shortcut (Ctrl+V / Cmd+V) - pastes with distinct offset beside original
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !(e.target instanceof HTMLInputElement)) {
        if (copiedSelection) {
          e.preventDefault();
          handlePaste();
        }
      }
      // Duplicate shortcut (Ctrl+D / Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selection && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        duplicateSelection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
        setIsPanMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    selection,
    copiedSelection,
    isAdjustingReference,
    commitSelectionToLayer,
    cancelSelection,
    deleteSelectionPermanently,
    copySelection,
    cutSelection,
    handlePaste,
    duplicateSelection,
  ]);

  const lastDrawnDataUrlRef = useRef<string | null>(null);

  /**
   * Load active layer artwork onto drawing canvas
   */
  const loadActiveLayerOntoCanvas = useCallback(async () => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeLayer?.dataUrl && activeLayer.dataUrl === lastDrawnDataUrlRef.current) {
      return;
    }

    if (!activeLayer?.dataUrl || !activeLayer.visible) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      lastDrawnDataUrlRef.current = null;
      return;
    }

    try {
      const img = await loadImage(activeLayer.dataUrl);
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.save();
      ctx.globalAlpha = activeLayer.opacity;
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();
      lastDrawnDataUrlRef.current = activeLayer.dataUrl;
    } catch (e) {
      console.warn('Failed to load active layer artwork', e);
    }
  }, [activeLayer?.dataUrl, activeLayer?.visible, activeLayer?.opacity, canvasWidth, canvasHeight]);

  useEffect(() => {
    loadActiveLayerOntoCanvas();
  }, [activeFrameIndex, activeLayerId, loadActiveLayerOntoCanvas]);

  /**
   * Render Bottom Layer (Background, Onion Skin, Reference Image, Lower Layers)
   */
  const renderBottomCanvas = useCallback(async () => {
    const canvas = bottomCanvasRef.current;
    if (!canvas || !activeFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Background Fill
    if (!canvasBgColor || canvasBgColor === 'transparent') {
      const tileSize = 24;
      for (let y = 0; y < canvasHeight; y += tileSize) {
        for (let x = 0; x < canvasWidth; x += tileSize) {
          ctx.fillStyle = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0 ? '#ffffff' : '#f1f1f5';
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. Reference Image Layer (rendered on bottom canvas when NOT in interactive adjust mode)
    if (referenceImage?.visible && referenceImage.dataUrl && !isAdjustingReference) {
      try {
        const refImg = await loadImage(referenceImage.dataUrl);
        ctx.save();
        ctx.globalAlpha = referenceImage.opacity;
        const rw = referenceImage.width || canvasWidth;
        const rh = referenceImage.height || canvasHeight;
        ctx.drawImage(refImg, referenceImage.x || 0, referenceImage.y || 0, rw, rh);
        ctx.restore();
      } catch {}
    }

    // 3. Onion Skinning
    if (onionSkin && !isPlaying) {
      if (prevFrame) {
        for (const l of prevFrame.layers) {
          if (l.visible && l.dataUrl) {
            try {
              const img = await loadImage(l.dataUrl);
              ctx.save();
              ctx.globalAlpha = onionSkinOpacity * l.opacity;
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
              ctx.globalCompositeOperation = 'source-atop';
              ctx.fillStyle = '#06B6D4';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);
              ctx.restore();
            } catch {}
          }
        }
      }

      if (onionSkinMode === 'both' && nextFrame) {
        for (const l of nextFrame.layers) {
          if (l.visible && l.dataUrl) {
            try {
              const img = await loadImage(l.dataUrl);
              ctx.save();
              ctx.globalAlpha = onionSkinOpacity * 0.8 * l.opacity;
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
              ctx.globalCompositeOperation = 'source-atop';
              ctx.fillStyle = '#EC4899';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);
              ctx.restore();
            } catch {}
          }
        }
      }
    }

    // 4. Lower Layers
    const activeLayerIdx = activeFrame.layers.findIndex((l) => l.id === activeLayerId);
    if (activeLayerIdx > 0) {
      for (let i = 0; i < activeLayerIdx; i++) {
        const lowerLayer = activeFrame.layers[i];
        if (lowerLayer.visible && lowerLayer.dataUrl) {
          try {
            const img = await loadImage(lowerLayer.dataUrl);
            ctx.save();
            ctx.globalAlpha = lowerLayer.opacity;
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            ctx.restore();
          } catch {}
        }
      }
    }

    // 5. Guides
    if (showGrid && !isPlaying) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        const gx = (canvasWidth / 3) * i;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvasHeight);
        ctx.stroke();

        const gy = (canvasHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvasWidth, gy);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2, 0);
      ctx.lineTo(canvasWidth / 2, canvasHeight);
      ctx.moveTo(0, canvasHeight / 2);
      ctx.lineTo(canvasWidth, canvasHeight / 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    canvasWidth,
    canvasHeight,
    canvasBgColor,
    referenceImage,
    isAdjustingReference,
    onionSkin,
    prevFrame,
    nextFrame,
    onionSkinOpacity,
    onionSkinMode,
    activeFrame,
    activeLayerId,
    isPlaying,
    showGrid,
  ]);

  /**
   * Render Top Overlay Layers
   */
  const renderTopOverlayCanvas = useCallback(async () => {
    const canvas = topOverlayCanvasRef.current;
    if (!canvas || !activeFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const activeLayerIdx = activeFrame.layers.findIndex((l) => l.id === activeLayerId);
    if (activeLayerIdx >= 0 && activeLayerIdx < activeFrame.layers.length - 1) {
      for (let i = activeLayerIdx + 1; i < activeFrame.layers.length; i++) {
        const upperLayer = activeFrame.layers[i];
        if (upperLayer.visible && upperLayer.dataUrl) {
          try {
            const img = await loadImage(upperLayer.dataUrl);
            ctx.save();
            ctx.globalAlpha = upperLayer.opacity;
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            ctx.restore();
          } catch {}
        }
      }
    }
  }, [activeFrame, activeLayerId, canvasWidth, canvasHeight]);

  useEffect(() => {
    renderBottomCanvas();
    renderTopOverlayCanvas();
  }, [renderBottomCanvas, renderTopOverlayCanvas]);

  // Freehand stroke segment
  const drawStrokeSegment = (
    ctx: CanvasRenderingContext2D,
    p0: Point,
    p1: Point,
    tool: string,
    size: number,
    color: string,
    opacity: number
  ) => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'eraser' ? eraserSize : size;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity;
    }

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Selection Transform Handlers (Scale, Tilt, Rotate)
   */
  const handleTransformDown = (
    e: React.PointerEvent,
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'rotate'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selection) return;

    isTransformingRef.current = true;
    transformTypeRef.current = type;
    transformStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      selX: selection.x,
      selY: selection.y,
      selW: selection.width,
      selH: selection.height,
      selRot: selection.rotation,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleTransformMove = (e: React.PointerEvent) => {
    if (!isTransformingRef.current || !selection) return;
    e.stopPropagation();

    const dx = ((e.clientX - transformStartRef.current.pointerX) / displayWidth) * canvasWidth;
    const dy = ((e.clientY - transformStartRef.current.pointerY) / displayHeight) * canvasHeight;
    const t = transformTypeRef.current;
    const s = transformStartRef.current;

    if (t === 'move') {
      setSelection({
        ...selection,
        x: Math.round(s.selX + dx),
        y: Math.round(s.selY + dy),
      });
    } else if (t === 'se') {
      setSelection({
        ...selection,
        width: Math.max(10, Math.round(s.selW + dx)),
        height: Math.max(10, Math.round(s.selH + dy)),
      });
    } else if (t === 'sw') {
      const newW = Math.max(10, Math.round(s.selW - dx));
      setSelection({
        ...selection,
        x: Math.round(s.selX + (s.selW - newW)),
        width: newW,
        height: Math.max(10, Math.round(s.selH + dy)),
      });
    } else if (t === 'ne') {
      const newH = Math.max(10, Math.round(s.selH - dy));
      setSelection({
        ...selection,
        y: Math.round(s.selY + (s.selH - newH)),
        width: Math.max(10, Math.round(s.selW + dx)),
        height: newH,
      });
    } else if (t === 'nw') {
      const newW = Math.max(10, Math.round(s.selW - dx));
      const newH = Math.max(10, Math.round(s.selH - dy));
      setSelection({
        ...selection,
        x: Math.round(s.selX + (s.selW - newW)),
        y: Math.round(s.selY + (s.selH - newH)),
        width: newW,
        height: newH,
      });
    } else if (t === 'e') {
      setSelection({
        ...selection,
        width: Math.max(10, Math.round(s.selW + dx)),
      });
    } else if (t === 'w') {
      const newW = Math.max(10, Math.round(s.selW - dx));
      setSelection({
        ...selection,
        x: Math.round(s.selX + (s.selW - newW)),
        width: newW,
      });
    } else if (t === 's') {
      setSelection({
        ...selection,
        height: Math.max(10, Math.round(s.selH + dy)),
      });
    } else if (t === 'n') {
      const newH = Math.max(10, Math.round(s.selH - dy));
      setSelection({
        ...selection,
        y: Math.round(s.selY + (s.selH - newH)),
        height: newH,
      });
    } else if (t === 'rotate') {
      const canvasElem = drawingCanvasRef.current;
      if (canvasElem) {
        const rect = canvasElem.getBoundingClientRect();
        const centerX = rect.left + ((selection.x + selection.width / 2) / canvasWidth) * displayWidth;
        const centerY = rect.top + ((selection.y + selection.height / 2) / canvasHeight) * displayHeight;
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const rad = Math.atan2(mouseY - centerY, mouseX - centerX);
        const deg = Math.round((rad * 180) / Math.PI) + 90;
        setSelection({
          ...selection,
          rotation: deg,
        });
      }
    }
  };

  const handleTransformUp = (e: React.PointerEvent) => {
    if (isTransformingRef.current) {
      isTransformingRef.current = false;
      transformTypeRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /**
   * Reference Image Freeform Transform Handlers (Drag sides in any direction)
   */
  const handleRefTransformDown = (
    e: React.PointerEvent,
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!referenceImage) return;

    isTransformingRefImageRef.current = true;
    refTransformTypeRef.current = type;
    refTransformStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      refX: referenceImage.x || 0,
      refY: referenceImage.y || 0,
      refW: referenceImage.width || canvasWidth,
      refH: referenceImage.height || canvasHeight,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleRefTransformMove = (e: React.PointerEvent) => {
    if (!isTransformingRefImageRef.current || !referenceImage) return;
    e.stopPropagation();

    const dx = ((e.clientX - refTransformStartRef.current.pointerX) / displayWidth) * canvasWidth;
    const dy = ((e.clientY - refTransformStartRef.current.pointerY) / displayHeight) * canvasHeight;
    const t = refTransformTypeRef.current;
    const s = refTransformStartRef.current;

    if (t === 'move') {
      setReferenceImage({
        ...referenceImage,
        x: Math.round(s.refX + dx),
        y: Math.round(s.refY + dy),
      });
    } else if (t === 'se') {
      setReferenceImage({
        ...referenceImage,
        width: Math.max(20, Math.round(s.refW + dx)),
        height: Math.max(20, Math.round(s.refH + dy)),
      });
    } else if (t === 'sw') {
      const newW = Math.max(20, Math.round(s.refW - dx));
      setReferenceImage({
        ...referenceImage,
        x: Math.round(s.refX + (s.refW - newW)),
        width: newW,
        height: Math.max(20, Math.round(s.refH + dy)),
      });
    } else if (t === 'ne') {
      const newH = Math.max(20, Math.round(s.refH - dy));
      setReferenceImage({
        ...referenceImage,
        y: Math.round(s.refY + (s.refH - newH)),
        width: Math.max(20, Math.round(s.refW + dx)),
        height: newH,
      });
    } else if (t === 'nw') {
      const newW = Math.max(20, Math.round(s.refW - dx));
      const newH = Math.max(20, Math.round(s.refH - dy));
      setReferenceImage({
        ...referenceImage,
        x: Math.round(s.refX + (s.refW - newW)),
        y: Math.round(s.refY + (s.refH - newH)),
        width: newW,
        height: newH,
      });
    } else if (t === 'e') {
      setReferenceImage({
        ...referenceImage,
        width: Math.max(20, Math.round(s.refW + dx)),
      });
    } else if (t === 'w') {
      const newW = Math.max(20, Math.round(s.refW - dx));
      setReferenceImage({
        ...referenceImage,
        x: Math.round(s.refX + (s.refW - newW)),
        width: newW,
      });
    } else if (t === 's') {
      setReferenceImage({
        ...referenceImage,
        height: Math.max(20, Math.round(s.refH + dy)),
      });
    } else if (t === 'n') {
      const newH = Math.max(20, Math.round(s.refH - dy));
      setReferenceImage({
        ...referenceImage,
        y: Math.round(s.refY + (s.refH - newH)),
        height: newH,
      });
    }
  };

  const handleRefTransformUp = (e: React.PointerEvent) => {
    if (isTransformingRefImageRef.current) {
      isTransformingRefImageRef.current = false;
      refTransformTypeRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  /**
   * Helper: Cleanly abort and revert any in-progress stroke
   */
  const cancelActiveStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    startPointRef.current = null;
    lastPointRef.current = null;

    const drawCanvas = drawingCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (drawCanvas) {
      const ctx = drawCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (preStrokeDataUrlRef.current) {
          const img = new Image();
          img.src = preStrokeDataUrlRef.current;
          img.onload = () => ctx.drawImage(img, 0, 0);
        }
      }
    }
    if (previewCanvas) {
      const prevCtx = previewCanvas.getContext('2d');
      prevCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight]);

  /**
   * Helper: Initialize pinch gesture when 2 pointers become active
   */
  const startPinchGesture = useCallback(() => {
    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length < 2) return;
    const [p1, p2] = pointers;
    const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
    const mid = { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };

    pinchStartRef.current = {
      distance: Math.max(dist, 1),
      midpoint: mid,
      zoom: useStudioStore.getState().zoom,
      panOffset: { ...panOffsetRef.current },
    };
    isPinchZoomingRef.current = true;
  }, []);

  /**
   * Helper: Calculate and apply zoom & pan translation centered on pinch midpoint
   */
  const updatePinchGesture = useCallback(() => {
    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length < 2) return;
    const [p1, p2] = pointers;
    const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
    const mid = { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };

    const { distance: d0, midpoint: mid0, zoom: z0, panOffset: startPan } = pinchStartRef.current;
    if (d0 < 5) return;

    const scale = dist / d0;
    const targetZoom = Math.max(25, Math.min(1200, Math.round(z0 * scale)));

    const container = workspaceContainerRef.current;
    const rect = container
      ? container.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const k = targetZoom / z0;
    const vx = mid0.x - (cx + startPan.x);
    const vy = mid0.y - (cy + startPan.y);

    const newPanX = Math.round(mid.x - cx - vx * k);
    const newPanY = Math.round(mid.y - cy - vy * k);

    setPanOffset({ x: newPanX, y: newPanY });
    panOffsetRef.current = { x: newPanX, y: newPanY };
    setZoom(targetZoom);
  }, [setZoom]);

  /**
   * Prevent native page gesture zoom on multi-touch
   */
  useEffect(() => {
    const container = workspaceContainerRef.current;
    if (!container) return;

    const preventDefaultMultiTouch = (e: TouchEvent) => {
      if (e.touches.length >= 2 || (e.cancelable && e.type === 'touchmove')) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', preventDefaultMultiTouch, { passive: false });
    container.addEventListener('touchmove', preventDefaultMultiTouch, { passive: false });
    container.addEventListener('touchend', preventDefaultMultiTouch, { passive: false });
    container.addEventListener('touchcancel', preventDefaultMultiTouch, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventDefaultMultiTouch);
      container.removeEventListener('touchmove', preventDefaultMultiTouch);
      container.removeEventListener('touchend', preventDefaultMultiTouch);
      container.removeEventListener('touchcancel', preventDefaultMultiTouch);
    };
  }, []);

  /**
   * Robust Everywhere Hand Panning & Workspace Multi-Touch
   */
  const handleWorkspacePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPlaying) return;
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Multi-touch: 2+ pointers initiate pinch zoom
    if (activePointersRef.current.size >= 2) {
      cancelActiveStroke();
      isPanningRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      startPinchGesture();
      return;
    }

    if (ignoreSingleTouchUntilLiftRef.current) return;

    const isPanTrigger = activeTool === 'hand' || isPanMode || isSpacePressedRef.current || e.button === 1;
    if (isPanTrigger) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        originX: panOffsetRef.current.x,
        originY: panOffsetRef.current.y,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleWorkspacePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (activePointersRef.current.size >= 2) {
      if (!isPinchZoomingRef.current) {
        cancelActiveStroke();
        startPinchGesture();
      } else {
        updatePinchGesture();
      }
      return;
    }

    if (isPinchZoomingRef.current || ignoreSingleTouchUntilLiftRef.current) return;

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      const newX = panStartRef.current.originX + dx;
      const newY = panStartRef.current.originY + dy;
      setPanOffset({ x: newX, y: newY });
      panOffsetRef.current = { x: newX, y: newY };
    }
  };

  const handleWorkspacePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (isPinchZoomingRef.current) {
      if (activePointersRef.current.size < 2) {
        isPinchZoomingRef.current = false;
        ignoreSingleTouchUntilLiftRef.current = true;
      }
      if (activePointersRef.current.size === 0) {
        ignoreSingleTouchUntilLiftRef.current = false;
      }
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      return;
    }

    if (activePointersRef.current.size === 0) {
      ignoreSingleTouchUntilLiftRef.current = false;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
  };

  /**
   * Primary Canvas Gesture Handlers (Drawing, Panning & Multi-Touch Pinch Zoom)
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;

    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Multi-touch: 2+ active touches trigger Pinch Zoom & Pan, NEVER drawing
    if (activePointersRef.current.size >= 2) {
      cancelActiveStroke();
      isPanningRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      startPinchGesture();
      return;
    }

    if (ignoreSingleTouchUntilLiftRef.current) return;

    // Pan Mode Trigger
    if (isSpacePressedRef.current || e.button === 1 || activeTool === 'hand' || isPanMode) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        originX: panOffsetRef.current.x,
        originY: panOffsetRef.current.y,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (e.button !== 0) return;
    if (activeLayer?.locked) {
      alert('Selected layer is locked. Unlock it to draw.');
      return;
    }

    // If clicking outside selection with another tool, commit it
    if (selection && activeTool !== 'select') {
      commitSelectionToLayer();
    }

    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const pt = getCanvasCoordinates(e.clientX, e.clientY);
    if (!pt) return;

    // Snapshot current layer state for safe multi-touch stroke aborting
    preStrokeDataUrlRef.current = activeLayer?.dataUrl || null;

    isDrawingRef.current = true;
    startPointRef.current = pt;
    lastPointRef.current = pt;

    const drawCanvas = drawingCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext('2d');
    if (!ctx) return;

    // Color Picker
    if (activeTool === 'picker') {
      const pixel = ctx.getImageData(Math.floor(pt.x), Math.floor(pt.y), 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2])
        .toString(16)
        .slice(1)}`;
      setColor(hex);
      isDrawingRef.current = false;
      return;
    }

    // Paint Bucket
    if (activeTool === 'bucket') {
      canvasFloodFill(ctx, pt.x, pt.y, selectedColor);
      const dataUrl = drawCanvas.toDataURL('image/png');
      lastDrawnDataUrlRef.current = dataUrl;
      commitLayerData(activeLayerId, dataUrl);
      isDrawingRef.current = false;
      return;
    }

    // Brush / Eraser Dot
    if (activeTool === 'brush' || activeTool === 'eraser') {
      const currentSize = activeTool === 'eraser' ? eraserSize : brushSize;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = currentSize;

      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = brushOpacity;
      }

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, currentSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // Multi-touch pinch zoom & pan handling
    if (activePointersRef.current.size >= 2) {
      if (!isPinchZoomingRef.current) {
        cancelActiveStroke();
        startPinchGesture();
      } else {
        updatePinchGesture();
      }
      return;
    }

    if (isPinchZoomingRef.current || ignoreSingleTouchUntilLiftRef.current) return;

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      const newX = panStartRef.current.originX + dx;
      const newY = panStartRef.current.originY + dy;
      setPanOffset({ x: newX, y: newY });
      panOffsetRef.current = { x: newX, y: newY };
      return;
    }

    const pt = getCanvasCoordinates(e.clientX, e.clientY);
    if (pt) {
      setHoverCoord({ x: Math.round(pt.x), y: Math.round(pt.y) });
    }

    if (!isDrawingRef.current || !lastPointRef.current || isPlaying) return;
    if (!pt) return;

    const drawCanvas = drawingCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!drawCanvas || !previewCanvas) return;
    const drawCtx = drawCanvas.getContext('2d');
    const prevCtx = previewCanvas.getContext('2d');
    if (!drawCtx || !prevCtx) return;

    // Selection Dragging Marquee (CRITICAL: update lastPointRef!)
    if (activeTool === 'select' && startPointRef.current) {
      lastPointRef.current = pt;
      prevCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      prevCtx.save();
      prevCtx.strokeStyle = '#000000';
      prevCtx.lineWidth = 1.5;
      prevCtx.setLineDash([4, 4]);

      const sx = Math.min(startPointRef.current.x, pt.x);
      const sy = Math.min(startPointRef.current.y, pt.y);
      const sw = Math.abs(pt.x - startPointRef.current.x);
      const sh = Math.abs(pt.y - startPointRef.current.y);

      prevCtx.strokeRect(sx, sy, sw, sh);
      prevCtx.restore();
      return;
    }

    // Brush & Eraser
    if (activeTool === 'brush' || activeTool === 'eraser') {
      const native = e.nativeEvent;
      const events =
        typeof native.getCoalescedEvents === 'function'
          ? native.getCoalescedEvents()
          : [native];

      for (const event of events) {
        const eventPt = getCanvasCoordinates(event.clientX, event.clientY);
        if (eventPt && lastPointRef.current) {
          drawStrokeSegment(
            drawCtx,
            lastPointRef.current,
            eventPt,
            activeTool,
            brushSize,
            selectedColor,
            brushOpacity
          );
          lastPointRef.current = eventPt;
        }
      }
      return;
    }

    // Shapes & Lines
    prevCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    prevCtx.save();
    prevCtx.lineWidth = brushSize;
    prevCtx.strokeStyle = selectedColor;
    prevCtx.fillStyle = selectedColor;
    prevCtx.globalAlpha = brushOpacity;
    prevCtx.lineCap = 'round';
    prevCtx.lineJoin = 'round';

    const s = startPointRef.current;
    if (!s) {
      prevCtx.restore();
      return;
    }

    if (activeTool === 'line') {
      prevCtx.beginPath();
      prevCtx.moveTo(s.x, s.y);
      prevCtx.lineTo(pt.x, pt.y);
      prevCtx.stroke();
    } else if (activeTool === 'rectangle') {
      const rx = Math.min(s.x, pt.x);
      const ry = Math.min(s.y, pt.y);
      const rw = Math.abs(pt.x - s.x);
      const rh = Math.abs(pt.y - s.y);
      if (shapeFill) prevCtx.fillRect(rx, ry, rw, rh);
      else prevCtx.strokeRect(rx, ry, rw, rh);
    } else if (activeTool === 'circle') {
      const rx = Math.abs(pt.x - s.x) / 2;
      const ry = Math.abs(pt.y - s.y) / 2;
      const cx = (s.x + pt.x) / 2;
      const cy = (s.y + pt.y) / 2;
      prevCtx.beginPath();
      prevCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (shapeFill) prevCtx.fill();
      else prevCtx.stroke();
    }

    prevCtx.restore();
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (isPinchZoomingRef.current) {
      if (activePointersRef.current.size < 2) {
        isPinchZoomingRef.current = false;
        ignoreSingleTouchUntilLiftRef.current = true;
      }
      if (activePointersRef.current.size === 0) {
        ignoreSingleTouchUntilLiftRef.current = false;
      }
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      return;
    }

    if (activePointersRef.current.size === 0) {
      ignoreSingleTouchUntilLiftRef.current = false;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const drawCanvas = drawingCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (drawCanvas && previewCanvas) {
      const drawCtx = drawCanvas.getContext('2d');
      const prevCtx = previewCanvas.getContext('2d');

      // Selection Creation - Guaranteed bounds calculation
      if (activeTool === 'select' && startPointRef.current) {
        prevCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
        const endPt = getCanvasCoordinates(e.clientX, e.clientY) || lastPointRef.current || startPointRef.current;
        const sx = Math.round(Math.min(startPointRef.current.x, endPt.x));
        const sy = Math.round(Math.min(startPointRef.current.y, endPt.y));
        const sw = Math.round(Math.abs(endPt.x - startPointRef.current.x));
        const sh = Math.round(Math.abs(endPt.y - startPointRef.current.y));

        if (sw > 3 && sh > 3 && drawCtx) {
          const selCanvas = document.createElement('canvas');
          selCanvas.width = sw;
          selCanvas.height = sh;
          const selCtx = selCanvas.getContext('2d')!;
          selCtx.drawImage(drawCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

          // Clear selected area on draw canvas
          drawCtx.clearRect(sx, sy, sw, sh);
          const dataUrl = drawCanvas.toDataURL('image/png');
          lastDrawnDataUrlRef.current = dataUrl;
          commitLayerData(activeLayerId, dataUrl);

          setSelection({
            active: true,
            x: sx,
            y: sy,
            width: sw,
            height: sh,
            rotation: 0,
            dataUrl: selCanvas.toDataURL('image/png'),
          });
        }
      } else if (
        activeTool === 'line' ||
        activeTool === 'rectangle' ||
        activeTool === 'circle'
      ) {
        drawCtx?.drawImage(previewCanvas, 0, 0);
        prevCtx?.clearRect(0, 0, canvasWidth, canvasHeight);
        const dataUrl = drawCanvas.toDataURL('image/png');
        lastDrawnDataUrlRef.current = dataUrl;
        commitLayerData(activeLayerId, dataUrl);
      } else if (activeTool === 'brush' || activeTool === 'eraser') {
        const dataUrl = drawCanvas.toDataURL('image/png');
        lastDrawnDataUrlRef.current = dataUrl;
        commitLayerData(activeLayerId, dataUrl);
      }
    }

    startPointRef.current = null;
    lastPointRef.current = null;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
  };

  const handlePointerLeave = () => {
    setHoverCoord(null);
  };

  const handleFitToScreen = () => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
    panOffsetRef.current = { x: 0, y: 0 };
  };

  const isPanActive = isPanMode || activeTool === 'hand' || isSpacePressedRef.current;

  return (
    <div
      ref={workspaceContainerRef}
      onPointerDown={handleWorkspacePointerDown}
      onPointerMove={handleWorkspacePointerMove}
      onPointerUp={handleWorkspacePointerUp}
      onPointerCancel={handleWorkspacePointerUp}
      className={`relative flex items-center justify-center w-full h-full min-h-0 select-none overflow-hidden touch-none ${className}`}
      style={{
        cursor: isPanActive ? (isPanningRef.current ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* Transform-Translated Artboard Center Wrapper (Infinite sideways & vertical panning) */}
      <div
        className="relative transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
        }}
      >
        {/* Artboard Frame */}
        <div className="relative flex-shrink-0 p-1.5 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl shadow-zinc-200/80">
          <div
            className="relative overflow-hidden rounded-2xl bg-white border border-[#E5E5EA] shadow-inner"
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
            }}
          >
            {/* 1. Bottom Canvas (Background, Onion Skin, Lower Layers) */}
            <canvas
              ref={bottomCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* 2. Direct On-Canvas Freeform Interactive Reference Image Overlay */}
            {referenceImage?.visible && referenceImage.dataUrl && (
              <div
                onPointerMove={handleRefTransformMove}
                onPointerUp={handleRefTransformUp}
                className={`absolute z-20 ${isAdjustingReference ? 'pointer-events-auto ring-2 ring-blue-500' : 'pointer-events-none'}`}
                style={{
                  left: `${((referenceImage.x || 0) / canvasWidth) * displayWidth}px`,
                  top: `${((referenceImage.y || 0) / canvasHeight) * displayHeight}px`,
                  width: `${((referenceImage.width || canvasWidth) / canvasWidth) * displayWidth}px`,
                  height: `${((referenceImage.height || canvasHeight) / canvasHeight) * displayHeight}px`,
                }}
              >
                <div
                  onPointerDown={(e) => handleRefTransformDown(e, 'move')}
                  className="w-full h-full relative group cursor-move"
                >
                  <img
                    src={referenceImage.dataUrl}
                    alt="Reference Guide"
                    className="w-full h-full object-fill pointer-events-none select-none"
                    style={{ opacity: referenceImage.opacity }}
                  />

                  {/* Freeform Interactive Drag Handles (when adjusting) */}
                  {isAdjustingReference && (
                    <>
                      {/* 4 Corners */}
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 'nw')}
                        title="Drag corner NW"
                        className="absolute -top-2 -left-2 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nwse-resize shadow-md"
                      />
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 'ne')}
                        title="Drag corner NE"
                        className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nesw-resize shadow-md"
                      />
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 'se')}
                        title="Drag corner SE"
                        className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nwse-resize shadow-md"
                      />
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 'sw')}
                        title="Drag corner SW"
                        className="absolute -bottom-2 -left-2 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-xs cursor-nesw-resize shadow-md"
                      />

                      {/* 4 Sides (Freeform Width & Height stretch) */}
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 'n')}
                        title="Drag top side (N)"
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-2.5 bg-blue-600 border border-white rounded-xs cursor-ns-resize shadow-xs"
                      />
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 's')}
                        title="Drag bottom side (S)"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2.5 bg-blue-600 border border-white rounded-xs cursor-ns-resize shadow-xs"
                      />
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 'w')}
                        title="Drag left side (W)"
                        className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-4 bg-blue-600 border border-white rounded-xs cursor-ew-resize shadow-xs"
                      />
                      <div
                        onPointerDown={(e) => handleRefTransformDown(e, 'e')}
                        title="Drag right side (E)"
                        className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-4 bg-blue-600 border border-white rounded-xs cursor-ew-resize shadow-xs"
                      />

                      {/* Floating Reference Toolbar */}
                      <div
                        className={`absolute ${((referenceImage.y / canvasHeight) * displayHeight < 45) ? 'top-[calc(100%+8px)]' : '-top-10'} left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black text-white text-[10px] font-bold shadow-xl z-50 pointer-events-auto whitespace-nowrap`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ImageIcon className="w-3 h-3 text-blue-400" />
                        <span>Freeform Reference</span>
                        <div className="w-[1px] h-3 bg-zinc-700 mx-0.5" />
                        <button
                          onClick={() => setIsAdjustingReference(false)}
                          title="Lock in place"
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Check className="w-3 h-3" />
                          <span>Lock Guide</span>
                        </button>
                        <button
                          onClick={() => setReferenceImage(null)}
                          title="Delete reference"
                          className="p-1 rounded-lg hover:bg-rose-900/60 text-rose-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 3. Active Layer Drawing Canvas */}
            <canvas
              ref={drawingCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* 4. Top Overlay Canvas (Upper Layers) */}
            <canvas
              ref={topOverlayCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* 5. Active Selection & Interactive Transform Overlay Box (Scale, Tilt, Rotate, Delete) */}
            {selection && selection.dataUrl && (() => {
              const selDisplayX = (selection.x / canvasWidth) * displayWidth;
              const selDisplayY = (selection.y / canvasHeight) * displayHeight;
              const selDisplayW = (selection.width / canvasWidth) * displayWidth;
              const selDisplayH = (selection.height / canvasHeight) * displayHeight;

              // Smart Y position: Above if space allows, Below if near top, Inside top if large/fills canvas
              let barTop: number;
              if (selDisplayY >= 56) {
                barTop = selDisplayY - 50;
              } else if (selDisplayY + selDisplayH + 56 <= displayHeight) {
                barTop = selDisplayY + selDisplayH + 12;
              } else {
                barTop = Math.max(12, selDisplayY + 12);
              }

              // Clamp bar position to canvas frame bounds
              barTop = Math.max(10, Math.min(displayHeight - 48, barTop));
              const barLeft = Math.max(160, Math.min(displayWidth - 160, selDisplayX + selDisplayW / 2));

              return (
                <>
                  <div
                    onPointerMove={handleTransformMove}
                    onPointerUp={handleTransformUp}
                    className="absolute z-30 pointer-events-auto"
                    style={{
                      left: `${selDisplayX}px`,
                      top: `${selDisplayY}px`,
                      width: `${selDisplayW}px`,
                      height: `${selDisplayH}px`,
                      transform: `rotate(${selection.rotation}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {/* Selection Box Frame */}
                    <div
                      onPointerDown={(e) => handleTransformDown(e, 'move')}
                      className="w-full h-full border-2 border-dashed border-black bg-black/5 cursor-move relative group"
                    >
                      <img
                        src={selection.dataUrl}
                        alt="Selection"
                        className="w-full h-full object-fill pointer-events-none select-none"
                      />

                      {/* 4 Corner Scale Handles */}
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 'nw')}
                        title="Scale NW"
                        className="absolute -top-2 -left-2 w-3.5 h-3.5 bg-white border-2 border-black rounded-xs cursor-nwse-resize shadow-xs hover:scale-125 transition-transform"
                      />
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 'ne')}
                        title="Scale NE"
                        className="absolute -top-2 -right-2 w-3.5 h-3.5 bg-white border-2 border-black rounded-xs cursor-nesw-resize shadow-xs hover:scale-125 transition-transform"
                      />
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 'se')}
                        title="Scale SE"
                        className="absolute -bottom-2 -right-2 w-3.5 h-3.5 bg-white border-2 border-black rounded-xs cursor-nwse-resize shadow-xs hover:scale-125 transition-transform"
                      />
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 'sw')}
                        title="Scale SW"
                        className="absolute -bottom-2 -left-2 w-3.5 h-3.5 bg-white border-2 border-black rounded-xs cursor-nesw-resize shadow-xs hover:scale-125 transition-transform"
                      />

                      {/* 4 Midpoint Freeform Scale Handles */}
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 'n')}
                        title="Scale Height (N)"
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-white border border-black rounded-xs cursor-ns-resize shadow-2xs"
                      />
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 's')}
                        title="Scale Height (S)"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-white border border-black rounded-xs cursor-ns-resize shadow-2xs"
                      />
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 'w')}
                        title="Scale Width (W)"
                        className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-3 bg-white border border-black rounded-xs cursor-ew-resize shadow-2xs"
                      />
                      <div
                        onPointerDown={(e) => handleTransformDown(e, 'e')}
                        title="Scale Width (E)"
                        className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-3 bg-white border border-black rounded-xs cursor-ew-resize shadow-2xs"
                      />

                      {/* Top Rotation Handle with Stem */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                        <div
                          onPointerDown={(e) => handleTransformDown(e, 'rotate')}
                          title="Drag to Tilt / Rotate"
                          className="w-4 h-4 rounded-full bg-black border-2 border-white shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform flex items-center justify-center text-white"
                        >
                          <RotateCw className="w-2.5 h-2.5" />
                        </div>
                        <div className="w-[1.5px] h-3 bg-black" />
                      </div>
                    </div>
                  </div>

                  {/* Floating Transform Action Bar (Guaranteed Always Inside Viewport & Readable) */}
                  <div
                    style={{
                      top: `${barTop}px`,
                      left: `${barLeft}px`,
                      transform: 'translateX(-50%)',
                    }}
                    className="absolute flex items-center gap-1 p-1 rounded-2xl bg-white border border-[#E5E5EA] shadow-2xl z-50 pointer-events-auto max-w-[95vw] whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={commitSelectionToLayer}
                      title="Apply Transform (Enter)"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black text-white text-[10px] font-bold hover:bg-zinc-800 shadow-xs transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      <span>Apply</span>
                    </button>

                    <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />

                    <button
                      onClick={copySelection}
                      title="Copy Selection (Ctrl+C)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 text-[10px] font-semibold transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={handlePaste}
                      disabled={!copiedSelection}
                      title={copiedSelection ? "Paste Selection (Ctrl+V)" : "Nothing copied yet"}
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 disabled:opacity-30 text-[10px] font-semibold transition-colors"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste</span>
                    </button>

                    <button
                      onClick={cutSelection}
                      title="Cut Selection (Ctrl+X)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 text-[10px] font-semibold transition-colors"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Cut</span>
                    </button>

                    <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />

                    <button
                      onClick={() => adjustRotation(-15)}
                      title="Tilt Left (-15°)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 text-[10px] font-semibold transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>-15°</span>
                    </button>

                    <button
                      onClick={() => adjustRotation(15)}
                      title="Tilt Right (+15°)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 text-[10px] font-semibold transition-colors"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>+15°</span>
                    </button>

                    <button
                      onClick={() => adjustRotation(90)}
                      title="Rotate 90°"
                      className="px-1.5 py-1 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 text-[10px] font-semibold transition-colors"
                    >
                      90°
                    </button>

                    <button
                      onClick={flipSelectionHorizontal}
                      title="Flip Horizontally"
                      className="p-1 rounded-lg text-zinc-700 hover:text-black hover:bg-zinc-100 transition-colors"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />

                    <button
                      onClick={deleteSelectionPermanently}
                      title="Delete Selection (Del / Backspace)"
                      className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[10px] font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={cancelSelection}
                      title="Cancel Transform (Esc)"
                      className="p-1 rounded-lg text-zinc-400 hover:text-black hover:bg-zinc-100 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              );
            })()}

            {/* 6. Top Interactive Gesture Canvas */}
            <canvas
              ref={previewCanvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUpOrCancel}
              onPointerCancel={handlePointerUpOrCancel}
              onPointerLeave={handlePointerLeave}
              className="absolute inset-0 w-full h-full touch-none"
              style={{
                cursor: isPanActive
                  ? isPanningRef.current
                    ? 'grabbing'
                    : 'grab'
                  : activeTool === 'picker'
                  ? 'crosshair'
                  : activeTool === 'bucket'
                  ? 'cell'
                  : activeTool === 'select'
                  ? 'crosshair'
                  : 'crosshair',
                touchAction: 'none',
              }}
            />

            {/* Hover Coordinate Badge */}
            {hoverCoord && (
              <div className="absolute bottom-2 left-2 pointer-events-none px-2 py-0.5 rounded-md bg-white/90 border border-[#E5E5EA] text-[10px] font-mono text-[#71717A] shadow-sm">
                X:{hoverCoord.x} Y:{hoverCoord.y}
              </div>
            )}
          </div>

          {/* Floating Top Quick Actions (Undo, Redo, Clear) */}
          <div className="absolute -top-3.5 right-6 flex items-center gap-1 p-1 rounded-xl bg-white border border-[#E5E5EA] shadow-md z-10">
            {referenceImage?.dataUrl && (
              <>
                <button
                  onClick={() => setIsAdjustingReference(!isAdjustingReference)}
                  title={isAdjustingReference ? 'Lock Reference Guide' : 'Adjust Reference Size/Position'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    isAdjustingReference
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-zinc-50 text-zinc-700 hover:text-black hover:bg-zinc-100 border-[#E5E5EA]'
                  }`}
                >
                  <Move className="w-3 h-3" />
                  <span>{isAdjustingReference ? 'Adjusting Guide' : 'Adjust Guide'}</span>
                </button>
                <div className="w-[1px] h-3.5 bg-[#E5E5EA] mx-0.5" />
              </>
            )}

            <button
              onClick={undo}
              disabled={past.length === 0}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] disabled:opacity-30 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] disabled:opacity-30 transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-[1px] h-3.5 bg-[#E5E5EA] mx-0.5" />
            <button
              onClick={clearCurrentFrame}
              title="Clear Current Layer"
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Zoom & Pan Controls Bar */}
      <div className="absolute bottom-3 right-5 flex items-center gap-1 p-1 rounded-2xl bg-white/95 border border-[#E5E5EA] shadow-lg backdrop-blur-md z-20">
        <button
          onClick={() => {
            const currentIdx = zoomPresets.findIndex((z) => z >= zoom);
            const prevZoom = currentIdx > 0 ? zoomPresets[currentIdx - 1] : zoomPresets[0];
            setZoom(prevZoom);
          }}
          title="Zoom Out"
          className="p-1.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <select
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="px-1.5 py-1 rounded-lg font-mono text-[11px] font-bold text-[#18181B] bg-[#F7F7FA] border border-[#E5E5EA] focus:outline-none cursor-pointer"
        >
          {zoomPresets.map((z) => (
            <option key={z} value={z}>
              {z}%
            </option>
          ))}
          {!zoomPresets.includes(zoom) && <option value={zoom}>{zoom}%</option>}
        </select>

        <button
          onClick={() => {
            const nextZoom = zoomPresets.find((z) => z > zoom) || zoomPresets[zoomPresets.length - 1];
            setZoom(nextZoom);
          }}
          title="Zoom In"
          className="p-1.5 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-[#E5E5EA] mx-0.5" />

        <button
          onClick={handleFitToScreen}
          title="Reset View / Fit to Screen"
          className="p-1.5 rounded-xl text-[#71717A] hover:text-black hover:bg-zinc-100 transition-colors"
        >
          <Maximize className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setIsPanMode(!isPanMode)}
          title={isPanMode ? 'Pan Mode: ON (Drag anywhere)' : 'Pan Mode (Space+Drag)'}
          className={`p-1.5 rounded-xl transition-colors ${
            isPanMode
              ? 'bg-black text-white font-bold'
              : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
