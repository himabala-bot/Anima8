'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { useRouter } from '../utils/router';
import { HomePage } from '../components/HomePage';
import { Canvas } from '../components/Canvas';
import { Toolbar } from '../components/Toolbar';
import { Timeline } from '../components/Timeline';
import { LayerPanel } from '../components/LayerPanel';
import { ExportModal } from '../components/ExportModal';
import { CanvasSizeModal } from '../components/CanvasSizeModal';
import { ReferenceImageModal } from '../components/ReferenceImageModal';
import { AudioTrackModal } from '../components/AudioTrackManager';
import { ProjectManagerModal } from '../components/ProjectManagerModal';
import { ShortcutsModal } from '../components/ShortcutsModal';
import {
  Film,
  Sparkles,
  Grid3X3,
  Eye,
  EyeOff,
  RotateCcw,
  Layers,
  HelpCircle,
  Undo2,
  Redo2,
  Edit2,
  Check,
  ChevronDown,
  MoreVertical,
  FolderKanban,
  Image as ImageIcon,
  Music,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Cloud,
  CloudOff,
  User,
  Trash2,
  Smartphone,
  RotateCw,
} from 'lucide-react';
import { syncEngine, CloudSyncState } from '../lib/sync/syncQueue';
import { useAuthStore } from '../store/useAuthStore';
import { AuthModal } from '../components/AuthModal';

// Global Mandatory Landscape Overlay
const RotateToLandscapeOverlay: React.FC<{ onRequestLandscape: () => void }> = ({ onRequestLandscape }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6 text-white text-center select-none">
    <div className="max-w-sm flex flex-col items-center gap-5 bg-zinc-900/95 border border-zinc-700/80 p-7 rounded-3xl shadow-2xl">
      <div className="relative w-20 h-20 flex items-center justify-center bg-zinc-800/90 rounded-2xl border border-zinc-700 shadow-inner">
        <Smartphone className="w-11 h-11 text-purple-400 rotate-90 transition-transform duration-700" />
        <RotateCw
          className="w-6 h-6 text-cyan-400 absolute -top-1.5 -right-1.5 animate-spin"
          style={{ animationDuration: '4s' }}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-black tracking-tight text-white">
          Rotate Device to Landscape
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
          Anima8 requires a landscape orientation across the entire application for the animation workspace, timeline, and projects studio. Please turn your device sideways.
        </p>
      </div>

      <button
        onClick={onRequestLandscape}
        className="w-full py-3 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/40 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <RotateCw className="w-4 h-4" />
        <span>Rotate to Landscape</span>
      </button>
    </div>
  </div>
);

export default function Anim8App() {
  const { path, projectId: routeProjectId, navigate } = useRouter();

  const isEditorRoute = path.startsWith('/editor/');
  const currentProjectId = useStudioStore((state) => state.projectId);
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>('idle');

  useEffect(() => {
    const unsub = syncEngine.subscribe((state) => {
      setCloudSyncState(state);
    });
    return unsub;
  }, []);
  const loadProjectById = useStudioStore((state) => state.loadProjectById);

  // When route is /editor/:id, load project into store if needed
  useEffect(() => {
    if (isEditorRoute && routeProjectId) {
      if (currentProjectId !== routeProjectId) {
        loadProjectById(routeProjectId);
      }
    }
  }, [isEditorRoute, routeProjectId, currentProjectId, loadProjectById]);

  // Modal states inside editor
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(true);

  const { user, isAuthenticated } = useAuthStore();

  const [isOnionPopoverOpen, setIsOnionPopoverOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [projectNameInput, setProjectNameInput] = useState<string>('');

  const onionPopoverRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const projectName = useStudioStore((state) => state.projectName);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const saveStatus = useStudioStore((state) => state.saveStatus);
  const showGrid = useStudioStore((state) => state.showGrid);
  const onionSkin = useStudioStore((state) => state.onionSkin);
  const onionSkinOpacity = useStudioStore((state) => state.onionSkinOpacity);
  const onionSkinMode = useStudioStore((state) => state.onionSkinMode);
  const referenceImage = useStudioStore((state) => state.referenceImage);
  const past = useStudioStore((state) => state.past);
  const future = useStudioStore((state) => state.future);

  const setProjectName = useStudioStore((state) => state.setProjectName);
  const setReferenceImage = useStudioStore((state) => state.setReferenceImage);
  const setShowGrid = useStudioStore((state) => state.setShowGrid);
  const setOnionSkin = useStudioStore((state) => state.setOnionSkin);
  const setOnionSkinOpacity = useStudioStore((state) => state.setOnionSkinOpacity);
  const setOnionSkinMode = useStudioStore((state) => state.setOnionSkinMode);
  const setTool = useStudioStore((state) => state.setTool);
  const undo = useStudioStore((state) => state.undo);
  const redo = useStudioStore((state) => state.redo);
  const resetStudio = useStudioStore((state) => state.resetStudio);
  const nextFrame = useStudioStore((state) => state.nextFrame);
  const prevFrame = useStudioStore((state) => state.prevFrame);
  const setIsPlaying = useStudioStore((state) => state.setIsPlaying);
  const saveToStorage = useStudioStore((state) => state.saveToStorage);

  // Orientation & Device Detection for Entire Application
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isNarrow = window.innerWidth <= 1024;
      setIsMobileOrTablet(isTouch || isNarrow);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const requestLandscape = async () => {
    try {
      if (screen.orientation && 'lock' in screen.orientation) {
        // @ts-expect-error Screen Orientation API lock
        await screen.orientation.lock('landscape');
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        if (screen.orientation && 'lock' in screen.orientation) {
          // @ts-expect-error Screen Orientation API lock
          await screen.orientation.lock('landscape');
        }
      }
    } catch {
      // Fallback: silently ignored if unsupported
    }
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (onionPopoverRef.current && !onionPopoverRef.current.contains(e.target as Node)) {
        setIsOnionPopoverOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        !isEditorRoute
      ) {
        return;
      }

      // Save shortcut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveToStorage();
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Playback
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsPlaying(!useStudioStore.getState().isPlaying);
        return;
      }

      if (e.key === ',') {
        prevFrame();
        return;
      }

      if (e.key === '.') {
        nextFrame();
        return;
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 'b':
          setTool('brush');
          break;
        case 'e':
          setTool('eraser');
          break;
        case 'h':
          setTool('hand');
          break;
        case 'l':
          setTool('line');
          break;
        case 'r':
          setTool('rectangle');
          break;
        case 'c':
          setTool('circle');
          break;
        case 'g':
          setTool('bucket');
          break;
        case 'i':
          setTool('picker');
          break;
        case 'o':
          setOnionSkin(!useStudioStore.getState().onionSkin);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setTool, setOnionSkin, setIsPlaying, nextFrame, prevFrame, saveToStorage, isEditorRoute]);

  const handleStartRename = () => {
    setProjectNameInput(projectName);
    setIsEditingName(true);
  };

  const handleSaveRename = () => {
    if (projectNameInput.trim()) {
      setProjectName(projectNameInput.trim());
    }
    setIsEditingName(false);
  };

  // 1. DEFAULT ENTRY ROUTE: HOME PAGE / PROJECT HUB
  if (!isEditorRoute) {
    return (
      <>
        {isMobileOrTablet && isPortrait && (
          <RotateToLandscapeOverlay onRequestLandscape={requestLandscape} />
        )}
        <HomePage
          onOpenProject={(projectId) => navigate(`/editor/${projectId}`)}
        />
      </>
    );
  }

  // 2. ANIMATION STUDIO EDITOR ROUTE (/editor/[projectId])
  return (
    <>
      {isMobileOrTablet && isPortrait && (
        <RotateToLandscapeOverlay onRequestLandscape={requestLandscape} />
      )}
      <main className="fixed inset-0 flex flex-col h-screen w-screen overflow-hidden bg-[#F7F7FA] text-[#18181B] select-none font-sans">
      {/* 1. TOP HEADER */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-3 md:px-5 bg-white border-b border-[#E5E5EA] shadow-xs z-30">
        {/* Brand & Back to Home */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            title="Return to Home / Projects"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5] text-xs font-bold text-[#18181B] transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-black" />
            <div className="flex items-center gap-1">
              <span className="font-extrabold tracking-tight">Anim8</span>
            </div>
          </button>

          <div className="h-5 w-[1px] bg-[#E5E5EA] hidden md:block flex-shrink-0" />

          {/* Project Title & Autosave Status */}
          <div className="hidden lg:flex items-center gap-2 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  onBlur={handleSaveRename}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                  autoFocus
                  className="px-2 py-0.5 rounded-lg border border-black bg-white text-xs font-semibold text-[#18181B] focus:outline-none"
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1 rounded bg-black text-white"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartRename}
                title="Click to rename project"
                className="group flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#F1F1F5] text-xs font-semibold text-[#18181B] transition-colors truncate"
              >
                <span className="truncate max-w-[130px]">{projectName}</span>
                <Edit2 className="w-3 h-3 text-[#71717A] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            )}

            {/* Autosave & Cloud Sync Status Badge */}
            <div className="flex items-center gap-1 text-[10px] text-[#71717A] font-medium">
              {saveStatus === 'saving' || cloudSyncState === 'syncing' ? (
                <span className="flex items-center gap-1 text-purple-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{saveStatus === 'saving' ? 'Saving...' : 'Syncing...'}</span>
                </span>
              ) : cloudSyncState === 'offline' ? (
                <span className="flex items-center gap-1 text-zinc-500" title="Working offline - changes saved locally in IndexedDB">
                  <CloudOff className="w-3 h-3 text-zinc-400" />
                  <span>Saved (Offline)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-600" title="Synchronized with Neon Cloud">
                  <Cloud className="w-3 h-3" />
                  <span>Cloud Synced</span>
                </span>
              )}
            </div>
          </div>

          {/* Canvas Resolution Chip */}
          <button
            onClick={() => setIsSizeModalOpen(true)}
            title="Change Canvas Resolution"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F1F1F5] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs font-mono font-bold text-[#18181B] transition-colors flex-shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>
              {canvasWidth} × {canvasHeight}
            </span>
          </button>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Reference Image Trigger with Quick Delete Option */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={() => setIsReferenceModalOpen(true)}
              title={referenceImage?.dataUrl ? "Reference Tracing Guide (Active)" : "Reference Tracing Guide"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                referenceImage?.dataUrl
                  ? 'rounded-l-xl bg-zinc-100 border-black text-black font-semibold'
                  : 'rounded-xl bg-white border-[#E5E5EA] text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-black" />
              <span>Reference</span>
            </button>
            {referenceImage?.dataUrl && (
              <button
                onClick={() => setReferenceImage(null)}
                title="Delete / Remove Reference Image"
                className="flex items-center px-1.5 py-1.5 rounded-r-xl border border-l-0 border-black bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Audio Track Trigger */}
          <button
            onClick={() => setIsAudioModalOpen(true)}
            title="Audio Track Settings"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-medium text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            <Music className="w-3.5 h-3.5 text-black" />
            <span>Audio</span>
          </button>

          {/* Layer Panel Toggle */}
          <button
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            title="Toggle Layers Panel"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isLayerPanelOpen
                ? 'bg-black border-black text-white font-bold'
                : 'bg-white border-[#E5E5EA] text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
          </button>

          {/* Onion Skin Popover */}
          <div className="relative hidden md:block" ref={onionPopoverRef}>
            <button
              onClick={() => setIsOnionPopoverOpen(!isOnionPopoverOpen)}
              title="Onion Skinning"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                onionSkin
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-800 font-bold'
                  : 'bg-white border-[#E5E5EA] text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5]'
              }`}
            >
              {onionSkin ? (
                <Eye className="w-3.5 h-3.5 text-cyan-600" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              <span>Onion</span>
              <ChevronDown className="w-3 h-3 text-[#71717A]" />
            </button>

            {isOnionPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 p-4 rounded-3xl bg-white border border-[#E5E5EA] shadow-xl z-50 text-[#18181B] animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E5EA]">
                  <span className="text-xs font-bold">Onion Skinning</span>
                  <input
                    type="checkbox"
                    checked={onionSkin}
                    onChange={(e) => setOnionSkin(e.target.checked)}
                    className="rounded border-[#E5E5EA] text-cyan-600 focus:ring-cyan-500"
                  />
                </div>

                {onionSkin && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] text-[#71717A] mb-1">
                        <span>Opacity:</span>
                        <span className="font-mono font-bold text-cyan-700">
                          {Math.round(onionSkinOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={Math.round(onionSkinOpacity * 100)}
                        onChange={(e) =>
                          setOnionSkinOpacity(Number(e.target.value) / 100)
                        }
                        className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-cyan-600"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] text-[#71717A] mb-1">
                        Frames to Show
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => setOnionSkinMode('prev')}
                          className={`py-1 px-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                            onionSkinMode === 'prev'
                              ? 'bg-cyan-50 border-cyan-400 text-cyan-800 font-bold'
                              : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#71717A]'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setOnionSkinMode('both')}
                          className={`py-1 px-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                            onionSkinMode === 'both'
                              ? 'bg-cyan-50 border-cyan-400 text-cyan-800 font-bold'
                              : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#71717A]'
                          }`}
                        >
                          Prev + Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shortcuts Modal Trigger */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            title="Keyboard Shortcuts"
            className="hidden md:flex p-2 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Account / Cloud Sync Trigger */}
          {isAuthenticated && user ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              title={`Account: ${user.displayName}`}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-semibold text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
            >
              <div className="w-4 h-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[70px] truncate">{user.displayName}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-medium text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
            >
              <User className="w-3.5 h-3.5 text-black" />
              <span>Cloud</span>
            </button>
          )}

          {/* Mobile Overflow Menu */}
          <div className="relative md:hidden" ref={mobileMenuRef}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              title="More Options"
              className="p-2 rounded-xl text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 p-2 rounded-2xl bg-white border border-[#E5E5EA] shadow-xl z-50 text-xs space-y-1">
                <button
                  onClick={() => {
                    navigate('/');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <ArrowLeft className="w-4 h-4 text-purple-600" />
                  <span>Back to Projects</span>
                </button>
                <button
                  onClick={() => {
                    setIsLayerPanelOpen(!isLayerPanelOpen);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Layers Panel</span>
                  </div>
                  {isLayerPanelOpen && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </button>
                <button
                  onClick={() => {
                    setIsReferenceModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  <span>Reference Tracing</span>
                </button>
                <button
                  onClick={() => {
                    setIsAudioModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <Music className="w-4 h-4 text-purple-600" />
                  <span>Audio Track</span>
                </button>
                <button
                  onClick={() => {
                    setIsSizeModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Canvas Size</span>
                </button>
                <button
                  onClick={() => {
                    setShowGrid(!showGrid);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-purple-600" />
                    <span>Guides</span>
                  </div>
                  {showGrid && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </button>
                <button
                  onClick={() => {
                    setOnionSkin(!onionSkin);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-600" />
                    <span>Onion Skin</span>
                  </div>
                  {onionSkin && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                </button>
                <button
                  onClick={() => {
                    setIsShortcutsModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[#F1F1F5]"
                >
                  <HelpCircle className="w-4 h-4 text-[#71717A]" />
                  <span>Shortcuts</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Reset studio and clear all frames?')) {
                      resetStudio();
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-rose-600"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Project</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action: Export Video/GIF Modal */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 md:gap-2 px-3.5 md:px-4 py-1.5 md:py-2 rounded-2xl text-xs font-bold bg-black hover:bg-zinc-800 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Film className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Landscape-First Studio) */}
      <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden relative">
        {/* Left Toolbar Rail (Compact 2-column dock, always on left for landscape animation studio workflow) */}
        <div className="flex flex-shrink-0 px-1.5 sm:px-3 py-1 sm:py-2 items-center justify-center max-h-full min-h-0 z-20">
          <Toolbar />
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 flex items-center justify-center min-h-0 min-w-0 overflow-hidden relative">
          <Canvas className="w-full h-full" />
        </div>

        {/* Right Layer Panel (Desktop Collapsible) */}
        {isLayerPanelOpen && (
          <div className="hidden lg:flex flex-shrink-0 w-64 p-3 z-20 max-h-full overflow-y-auto">
            <LayerPanel className="w-full" />
          </div>
        )}
      </div>

      {/* 3. TIMELINE */}
      <div className="flex-shrink-0 px-2 md:px-4 pb-2 z-20">
        <Timeline onOpenAudioModal={() => setIsAudioModalOpen(true)} />
      </div>

      {/* Modals & Dialogs */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <CanvasSizeModal
        isOpen={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
      />

      <ProjectManagerModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

      <ReferenceImageModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
      />

      <AudioTrackModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </main>
    </>
  );
}
