import React, { useEffect, useState, useRef } from 'react';
import { projectRepository } from '../repositories/projectRepository';
import { ProjectRecord } from '../utils/indexedDB';
import { useAuthStore } from '../store/useAuthStore';
import { AuthModal } from './AuthModal';
import {
  Sparkles,
  Plus,
  Search,
  SlidersHorizontal,
  FolderKanban,
  Calendar,
  Layers,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Download,
  Film,
  ArrowRight,
  Play,
  User,
  Clock,
  X,
  Check,
  Cloud,
  CloudOff,
  UploadCloud,
} from 'lucide-react';

interface HomePageProps {
  onOpenProject: (projectId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'edited' | 'created' | 'name'>('edited');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const { user, isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // New Project Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('My 2D Animation');
  const [canvasPreset, setCanvasPreset] = useState<string>('1280x720');
  const [customWidth, setCustomWidth] = useState<number>(1280);
  const [customHeight, setCustomHeight] = useState<number>(720);
  const [bgColor, setBgColor] = useState<string | null>('#ffffff');
  const [fps, setFps] = useState<number>(12);

  // Rename modal / popover
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const list = await projectRepository.getAllProjects();
      setProjects(list);
    } catch (e) {
      console.warn('Failed to load projects', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateProject = async () => {
    let width = customWidth;
    let height = customHeight;

    if (canvasPreset !== 'custom') {
      const [w, h] = canvasPreset.split('x').map(Number);
      width = w;
      height = h;
    }

    const newProject = await projectRepository.createProject(
      projectName.trim() || 'Untitled Animation',
      width,
      height,
      bgColor,
      fps
    );

    setIsNewProjectModalOpen(false);
    onOpenProject(newProject.id);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    try {
      await projectRepository.duplicateProject(id);
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (window.confirm('Are you sure you want to delete this project permanently?')) {
      await projectRepository.deleteProject(id);
      fetchProjects();
    }
  };

  const handleStartRename = (project: ProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setRenamingProjectId(project.id);
    setRenameInput(project.name);
  };

  const handleSaveRename = async (id: string) => {
    if (!renameInput.trim()) {
      setRenamingProjectId(null);
      return;
    }
    const proj = await projectRepository.getProjectById(id);
    if (proj) {
      proj.name = renameInput.trim();
      await projectRepository.saveProject(proj);
      fetchProjects();
    }
    setRenamingProjectId(null);
  };

  const handleExportProject = async (project: ProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);

    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.anim8`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter & Sort
  const filteredProjects = projects
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'edited') return b.updatedAt - a.updatedAt;
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      return a.name.localeCompare(b.name);
    });

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen w-full bg-[#F7F7FA] text-[#18181B] font-sans flex flex-col">
      {/* 1. TOP NAVIGATION HEADER */}
      <header className="h-11 sm:h-16 flex-shrink-0 bg-white border-b border-[#E5E5EA] px-3 sm:px-8 flex items-center justify-between shadow-xs sticky top-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-black text-white shadow-sm">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#18181B]">
                Anim8
              </span>
              <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-[9px] sm:text-[10px] font-bold">
                STUDIO
              </span>
            </div>
          </div>
        </div>

        {/* Center Nav */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-[#F7F7FA] border border-[#E5E5EA]">
          <div className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-black shadow-xs border border-[#E5E5EA]">
            Projects Hub
          </div>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {isAuthenticated && user ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              title={`Account: ${user.displayName} (${user.email})`}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold bg-[#F1F1F5] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-[#18181B] transition-colors"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black text-white text-[9px] sm:text-[10px] flex items-center justify-center font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate">{user.displayName}</span>
              <Cloud className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold bg-white hover:bg-[#F1F1F5] border border-[#E5E5EA] text-[#18181B] transition-colors shadow-2xs"
            >
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" />
              <span>Sign In / Cloud</span>
            </button>
          )}

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold bg-black hover:bg-zinc-800 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* 2. HERO WELCOME SECTION */}
      <section className="px-3 sm:px-8 py-2.5 sm:py-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6 p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl bg-black text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-1 sm:space-y-2 max-w-xl">
            <h1 className="text-base sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome to Anim8
            </h1>
            <p className="text-[11px] sm:text-sm md:text-base text-zinc-300">
              Create, animate, and bring your ideas to life with frame-by-frame strokes, multi-layers, and smooth video export.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white text-black font-extrabold text-xs sm:text-sm shadow-lg hover:bg-zinc-100 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
              <span>Create Animation</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. PROJECTS DASHBOARD SECTION */}
      <main className="flex-1 px-3 sm:px-8 pb-8 sm:pb-16 max-w-7xl mx-auto w-full space-y-3 sm:space-y-6">
        {/* Search, Filter & Sort Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-sm sm:text-lg font-bold text-[#18181B]">Your Animations</h2>
            <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-[#E5E5EA] text-[#71717A] text-[10px] sm:text-xs font-mono font-bold">
              {filteredProjects.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white border border-[#E5E5EA] text-[11px] sm:text-xs text-[#18181B] focus:outline-none focus:ring-2 focus:ring-black shadow-xs"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-[#E5E5EA] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-xs text-[11px] sm:text-xs">
              <SlidersHorizontal className="w-3 h-3 text-[#71717A]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort projects"
                className="bg-transparent border-0 text-[11px] sm:text-xs font-semibold text-[#18181B] focus:outline-none cursor-pointer"
              >
                <option value="edited">Recently Edited</option>
                <option value="created">Recently Created</option>
                <option value="name">Project Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-44 sm:h-64 rounded-2xl sm:rounded-3xl bg-white border border-[#E5E5EA] animate-pulse p-2 sm:p-4"
              />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 md:p-16 rounded-2xl sm:rounded-3xl bg-white border border-[#E5E5EA] text-center shadow-xs">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-black mb-3 sm:mb-4">
              <Film className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-[#18181B]">
              {searchQuery ? 'No matching projects found' : 'Create your first animation'}
            </h3>
            <p className="text-[11px] sm:text-xs text-[#71717A] max-w-sm mt-1 mb-4 sm:mb-6">
              {searchQuery
                ? 'Try searching with a different name or keyword.'
                : 'Start drawing frame-by-frame with smooth brushes, multiple layers, and audio synchronization.'}
            </p>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-black hover:bg-zinc-800 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-all hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>New Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {filteredProjects.map((proj) => {
              const frameCount = proj.frames?.length || 1;
              const isRenaming = renamingProjectId === proj.id;
              const isMenuOpen = activeMenuId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => onOpenProject(proj.id)}
                  className="group relative flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-[#E5E5EA] hover:border-black/30 hover:shadow-xl hover:shadow-black/5 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* Thumbnail Banner */}
                  <div className="relative w-full aspect-video bg-[#F7F7FA] border-b border-[#E5E5EA] flex items-center justify-center overflow-hidden">
                    {proj.thumbnailDataUrl ? (
                      <img
                        src={proj.thumbnailDataUrl}
                        alt={proj.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#A1A1AA] gap-0.5">
                        <Film className="w-6 h-6 sm:w-8 sm:h-8 text-[#D4D4D8] group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] sm:text-[10px] font-mono">Frame #1</span>
                      </div>
                    )}

                    {/* Hover Open Overlay */}
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
                      <span className="flex items-center gap-1 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-white text-[#18181B] text-[10px] sm:text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <span>Open Editor</span>
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" />
                      </span>
                    </div>

                    {/* Frame Count Pill */}
                    <span className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-md bg-white/90 backdrop-blur-md border border-[#E5E5EA] text-[9px] sm:text-[10px] font-mono font-bold text-[#18181B] shadow-xs">
                      {frameCount} {frameCount === 1 ? 'fr' : 'frs'}
                    </span>

                    {/* Cloud Sync Status Pill */}
                    <span
                      title={isAuthenticated ? 'Cloud Synced with Neon' : 'Saved locally in IndexedDB'}
                      className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-0.5 sm:p-1 rounded-md bg-white/90 backdrop-blur-md border border-[#E5E5EA] shadow-xs flex items-center justify-center"
                    >
                      {isAuthenticated ? (
                        <Cloud className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                      ) : (
                        <CloudOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-400" />
                      )}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-2 sm:p-3.5 flex flex-col justify-between flex-1 gap-1">
                    <div className="space-y-0.5 sm:space-y-1">
                      {isRenaming ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onBlur={() => handleSaveRename(proj.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(proj.id)}
                            autoFocus
                            className="w-full px-1.5 py-0.5 rounded border border-black text-[11px] sm:text-xs font-bold text-[#18181B] focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveRename(proj.id)}
                            className="p-0.5 rounded bg-black text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-bold text-xs sm:text-sm text-[#18181B] truncate group-hover:text-black transition-colors">
                            {proj.name}
                          </h3>

                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {/* Direct Delete Project Button */}
                            <button
                              onClick={(e) => handleDelete(proj.id, e)}
                              title="Delete Project permanently"
                              className="p-0.5 sm:p-1 rounded text-[#71717A] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>

                            {/* More Card Menu Trigger */}
                            <div className="relative" ref={isMenuOpen ? menuRef : null}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(isMenuOpen ? null : proj.id);
                                }}
                                title="More options"
                                className="p-0.5 sm:p-1 rounded text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
                              >
                                <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>

                              {/* Dropdown Flyout */}
                              {isMenuOpen && (
                                <div
                                  className="absolute right-0 top-full mt-1 w-36 sm:w-44 p-1 rounded-xl sm:rounded-2xl bg-white border border-[#E5E5EA] shadow-xl z-50 text-[11px] sm:text-xs space-y-0.5 animate-in fade-in duration-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                <button
                                  onClick={(e) => handleStartRename(proj, e)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#F1F1F5] text-[#18181B] font-medium"
                                >
                                  <Edit2 className="w-3 h-3 text-[#71717A]" />
                                  <span>Rename</span>
                                </button>
                                <button
                                  onClick={(e) => handleDuplicate(proj.id, e)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#F1F1F5] text-[#18181B] font-medium"
                                >
                                  <Copy className="w-3 h-3 text-[#71717A]" />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  onClick={(e) => handleExportProject(proj, e)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[#F1F1F5] text-[#18181B] font-medium"
                                >
                                  <Download className="w-3 h-3 text-[#71717A]" />
                                  <span>Export .anim8</span>
                                </button>
                                <div className="h-[1px] bg-[#E5E5EA] my-0.5" />
                                <button
                                  onClick={(e) => handleDelete(proj.id, e)}
                                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-rose-50 text-rose-600 font-medium"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Specs */}
                      <div className="flex items-center gap-1 text-[9px] sm:text-[11px] font-mono text-[#71717A]">
                        <span>{proj.canvasWidth}×{proj.canvasHeight}</span>
                        <span>•</span>
                        <span>{proj.fps} FPS</span>
                      </div>
                    </div>

                    {/* Relative Time Footer */}
                    <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-[#A1A1AA] pt-1.5 sm:pt-2 mt-0.5 sm:mt-1 border-t border-[#E5E5EA]">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="truncate">{formatRelativeTime(proj.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. CREATE NEW PROJECT MODAL */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">New Animation Project</h2>
                  <p className="text-xs text-[#71717A]">
                    Configure your canvas size and frame rate
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Character Walk Cycle"
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F7FA] border border-[#E5E5EA] text-xs font-semibold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Canvas Resolution Presets */}
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1">
                  Canvas Size
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: '1920x1080', label: '1080p (16:9)', w: 1920, h: 1080 },
                    { id: '1280x720', label: '720p HD', w: 1280, h: 720 },
                    { id: '1080x1080', label: 'Square (1:1)', w: 1080, h: 1080 },
                    { id: '1080x1920', label: 'Vertical (9:16)', w: 1080, h: 1920 },
                    { id: '2048x2048', label: '2K High-Res', w: 2048, h: 2048 },
                    { id: 'custom', label: 'Custom', w: customWidth, h: customHeight },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCanvasPreset(preset.id)}
                      className={`p-2 rounded-xl text-xs font-medium border transition-all text-left ${canvasPreset === preset.id
                          ? 'bg-black border-black text-white font-bold shadow-xs'
                          : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#18181B] hover:bg-white'
                        }`}
                    >
                      <div>{preset.label}</div>
                      <div className={`text-[10px] font-mono ${canvasPreset === preset.id ? 'text-zinc-300' : 'text-[#71717A]'}`}>
                        {preset.w} × {preset.h}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom Dimensions Input */}
                {canvasPreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#E5E5EA]">
                    <div>
                      <span className="block text-[10px] text-[#71717A] mb-0.5">Width (px)</span>
                      <input
                        type="number"
                        min={200}
                        max={3840}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="w-full px-2.5 py-1 rounded-xl bg-[#F7F7FA] border border-[#E5E5EA] text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#71717A] mb-0.5">Height (px)</span>
                      <input
                        type="number"
                        min={200}
                        max={3840}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="w-full px-2.5 py-1 rounded-xl bg-[#F7F7FA] border border-[#E5E5EA] text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1">
                  Background
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: '#ffffff', label: 'White' },
                    { id: 'transparent', label: 'Transparent' },
                    { id: '#000000', label: 'Black' },
                    { id: '#1e1b4b', label: 'Midnight' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBgColor(bg.id === 'transparent' ? null : bg.id)}
                      className={`p-1.5 rounded-xl text-xs font-medium border transition-all text-center ${(bg.id === 'transparent' && !bgColor) || bgColor === bg.id
                          ? 'bg-black border-black text-white font-bold shadow-xs'
                          : 'bg-[#F7F7FA] border-[#E5E5EA] text-[#18181B] hover:bg-white'
                        }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FPS Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-[#18181B] mb-1">
                  <span>Frame Rate</span>
                  <span className="font-mono text-black font-bold">{fps} FPS</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#E5E5EA] rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#71717A] hover:text-[#18181B] hover:bg-[#F1F1F5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-black hover:bg-zinc-800 text-white shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Create Animation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
