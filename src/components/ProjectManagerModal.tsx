import React, { useEffect, useState, useRef } from 'react';
import {
  useStudioStore,
  createEmptyFrame,
} from '../store/useStudioStore';
import {
  getAllProjectsFromDB,
  saveProjectToDB,
  deleteProjectFromDB,
  ProjectRecord,
} from '../utils/indexedDB';
import {
  FolderKanban,
  X,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Calendar,
  Layers,
  Sparkles,
  FileCode,
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const currentProjectId = useStudioStore((state) => state.projectId);
  const currentProjectName = useStudioStore((state) => state.projectName);
  const canvasWidth = useStudioStore((state) => state.canvasWidth);
  const canvasHeight = useStudioStore((state) => state.canvasHeight);
  const canvasBgColor = useStudioStore((state) => state.canvasBgColor);
  const fps = useStudioStore((state) => state.fps);
  const frames = useStudioStore((state) => state.frames);
  const audioTrack = useStudioStore((state) => state.audioTrack);
  const referenceImage = useStudioStore((state) => state.referenceImage);

  const loadProject = useStudioStore((state) => state.loadProject);
  const createNewProject = useStudioStore((state) => state.createNewProject);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('Anim8 Project');
  const [newWidth, setNewWidth] = useState<number>(1280);
  const [newHeight, setNewHeight] = useState<number>(720);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjects = async () => {
    try {
      const list = await getAllProjectsFromDB();
      setProjects(list);
    } catch (e) {
      console.warn('Failed to list projects', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    createNewProject(newTitle.trim() || 'Untitled Animation', newWidth, newHeight);
    setIsCreatingNew(false);
    onClose();
  };

  const handleOpen = (proj: ProjectRecord) => {
    loadProject(proj);
    onClose();
  };

  const handleDuplicate = async (proj: ProjectRecord) => {
    const duplicated: ProjectRecord = {
      ...proj,
      id: `proj_${Date.now()}`,
      name: `${proj.name} Copy`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveProjectToDB(duplicated);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this project permanently?')) {
      await deleteProjectFromDB(id);
      fetchProjects();
    }
  };

  // Export current project as .anim8 JSON file
  const handleExportProjectFile = () => {
    const projectData = {
      version: '2.0',
      id: currentProjectId,
      name: currentProjectName,
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      fps,
      frames,
      audioTrack,
      referenceImage,
      exportedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProjectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.anim8`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import .anim8 / .chibi JSON file
  const handleImportProjectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        if (parsed.frames && Array.isArray(parsed.frames)) {
          const projectRecord: ProjectRecord = {
            id: parsed.id || `proj_${Date.now()}`,
            name: parsed.name || file.name.replace(/\.(anim8|chibi)$/, ''),
            canvasWidth: parsed.canvasWidth || 1280,
            canvasHeight: parsed.canvasHeight || 720,
            canvasBgColor: parsed.canvasBgColor || '#ffffff',
            fps: parsed.fps || 12,
            frames: parsed.frames,
            audioTrack: parsed.audioTrack || null,
            referenceImage: parsed.referenceImage || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          await saveProjectToDB(projectRecord);
          loadProject(projectRecord);
          onClose();
        } else {
          alert('Invalid Anim8 project file format.');
        }
      } catch (err) {
        alert('Failed to parse Anim8 project file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl p-6 rounded-3xl bg-white border border-[#E5E5EA] shadow-2xl text-[#18181B] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 text-black border border-zinc-200">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Project Hub</h2>
              <p className="text-xs text-[#71717A]">
                Manage, import, and export your 2D animation projects
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

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 my-4 flex-shrink-0">
          <button
            onClick={() => setIsCreatingNew(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Animation</span>
          </button>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportProjectFile}
              accept=".anim8,.chibi,.json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import .anim8 editable project"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F7F7FA] hover:bg-[#F1F1F5] border border-[#E5E5EA] text-xs font-semibold text-[#18181B] transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-black" />
              <span>Import Project (.anim8)</span>
            </button>

            <button
              onClick={handleExportProjectFile}
              title="Download editable project backup"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F7F7FA] hover:bg-[#F1F1F5] border border-[#E5E5EA] text-xs font-semibold text-[#18181B] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>Export .anim8 File</span>
            </button>
          </div>
        </div>

        {/* Modal Body / Project Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
          {isCreatingNew ? (
            <div className="p-4 rounded-3xl bg-[#F7F7FA] border border-[#E5E5EA] space-y-3">
              <h3 className="text-xs font-bold text-[#18181B]">Create New Animation Project</h3>
              <div>
                <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-semibold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={newWidth}
                    onChange={(e) => setNewWidth(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-mono font-semibold text-[#18181B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={(e) => setNewHeight(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#E5E5EA] text-xs font-mono font-semibold text-[#18181B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#71717A] hover:bg-[#E5E5EA]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-black text-white hover:bg-zinc-800 shadow-sm"
                >
                  Create Project
                </button>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-[#71717A]">
              <FileCode className="w-10 h-10 text-zinc-300 mb-2" />
              <p className="text-xs font-semibold">No saved projects found in local library</p>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                Your current project is automatically saved as you draw!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((proj) => {
                const isCurrent = proj.id === currentProjectId;
                return (
                  <div
                    key={proj.id}
                    onClick={() => handleOpen(proj)}
                    className={`flex flex-col p-3.5 rounded-3xl border transition-all cursor-pointer group ${
                      isCurrent
                        ? 'bg-zinc-50 border-black shadow-sm ring-1 ring-black'
                        : 'bg-[#F7F7FA] border-[#E5E5EA] hover:bg-white hover:border-[#D4D4D8] hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#18181B] truncate">
                        {proj.name}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-black text-white text-[9px] font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#71717A] mb-3 font-mono">
                      <span>{proj.canvasWidth} × {proj.canvasHeight} px</span>
                      <span>•</span>
                      <span>{proj.frames?.length || 1} frames</span>
                      <span>•</span>
                      <span>{proj.fps} FPS</span>
                    </div>

                    <div
                      className="flex items-center justify-between pt-2 border-t border-[#E5E5EA] text-[10px] text-[#71717A]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(proj)}
                          title="Duplicate Project"
                          className="p-1.5 rounded-lg hover:bg-zinc-200 hover:text-black transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(proj.id)}
                          title="Delete Project"
                          className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-[#E5E5EA] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F1F1F5] hover:bg-[#E5E5EA] text-[#18181B] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
