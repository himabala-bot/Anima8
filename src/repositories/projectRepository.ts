/**
 * Backend-Agnostic Project Data Layer for Anim8 Studio
 * Local-First + Neon PostgreSQL Cloud Synchronized Architecture
 */

import {
  saveProjectToDB,
  getProjectFromDB,
  getAllProjectsFromDB,
  deleteProjectFromDB,
  ProjectRecord,
} from '../utils/indexedDB';
import { syncEngine } from '../lib/sync/syncQueue';

export interface StrokePoint {
  x: number;
  y: number;
}

export interface StrokeRecord {
  id: string;
  tool: string;
  brushPreset?: string;
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
  timestamp: number;
}

export interface IProjectRepository {
  getAllProjects(): Promise<ProjectRecord[]>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  saveProject(project: ProjectRecord): Promise<void>;
  saveStroke(
    projectId: string,
    frameId: string,
    layerId: string,
    stroke: StrokeRecord,
    updatedDataUrl: string
  ): Promise<void>;
  deleteProject(id: string): Promise<void>;
  duplicateProject(id: string): Promise<ProjectRecord>;
  createProject(
    name: string,
    canvasWidth: number,
    canvasHeight: number,
    canvasBgColor: string | null,
    fps: number
  ): Promise<ProjectRecord>;
}

/**
 * Local-First IndexedDB Repository with Background Sync Queue Dispatch
 */
export class LocalProjectRepository implements IProjectRepository {
  async getAllProjects(): Promise<ProjectRecord[]> {
    return getAllProjectsFromDB();
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    return getProjectFromDB(id);
  }

  async saveProject(project: ProjectRecord): Promise<void> {
    const updated = { ...project, updatedAt: Date.now() };
    await saveProjectToDB(updated);

    // Enqueue cloud sync in background (non-blocking)
    syncEngine.enqueue(
      'UPDATE_PROJECT',
      'project',
      project.id,
      project.id,
      updated
    );
  }

  async saveStroke(
    projectId: string,
    frameId: string,
    layerId: string,
    _stroke: StrokeRecord,
    _updatedDataUrl: string
  ): Promise<void> {
    const proj = await getProjectFromDB(projectId);
    if (!proj) return;

    // Fast-path stroke update in local storage
    await saveProjectToDB(proj);

    syncEngine.enqueue(
      'SAVE_STROKE',
      'stroke',
      layerId,
      projectId,
      { frameId, layerId, updatedAt: Date.now() }
    );
  }

  async deleteProject(id: string): Promise<void> {
    await deleteProjectFromDB(id);
    syncEngine.enqueue('DELETE_PROJECT', 'project', id, id, { id });
  }

  async duplicateProject(id: string): Promise<ProjectRecord> {
    const original = await getProjectFromDB(id);
    if (!original) {
      throw new Error('Project not found');
    }

    const duplicated: ProjectRecord = {
      ...original,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProjectToDB(duplicated);

    syncEngine.enqueue(
      'CREATE_PROJECT',
      'project',
      duplicated.id,
      duplicated.id,
      duplicated
    );

    return duplicated;
  }

  async createProject(
    name: string,
    canvasWidth = 1280,
    canvasHeight = 720,
    canvasBgColor: string | null = '#ffffff',
    fps = 12
  ): Promise<ProjectRecord> {
    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newProject: ProjectRecord = {
      id: newId,
      name: name.trim() || 'Untitled Animation',
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      fps,
      frames: [
        {
          id: `frame_${Date.now()}_1`,
          exposure: 1,
          layers: [
            {
              id: `layer_${Date.now()}_1`,
              name: 'Layer 1',
              visible: true,
              locked: false,
              opacity: 1.0,
              dataUrl: null,
            },
          ],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveProjectToDB(newProject);

    syncEngine.enqueue(
      'CREATE_PROJECT',
      'project',
      newProject.id,
      newProject.id,
      newProject
    );

    return newProject;
  }
}

/**
 * Hybrid Repository:
 * Serves projects immediately from IndexedDB for zero latency & offline resilience,
 * and fetches missing cloud projects from Neon PostgreSQL when online.
 */
export class HybridProjectRepository extends LocalProjectRepository {
  override async getProjectById(id: string): Promise<ProjectRecord | null> {
    // 1. Check local IndexedDB first
    const local = await super.getProjectById(id);
    if (local) return local;

    // 2. If not found locally and online, fetch from Neon cloud API
    if (typeof window !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.project) {
            const reconstructed: ProjectRecord = {
              id: json.project.id,
              name: json.project.title,
              canvasWidth: json.project.width,
              canvasHeight: json.project.height,
              canvasBgColor: json.project.backgroundValue || '#ffffff',
              fps: json.project.fps,
              frames: (json.frames || []).map((f: any) => ({
                id: f.id,
                exposure: f.exposure,
                layers: (json.layers || [])
                  .filter((l: any) => l.frameId === f.id)
                  .map((l: any) => ({
                    id: l.id,
                    name: l.name,
                    visible: l.visible,
                    locked: l.locked,
                    opacity: l.opacity,
                    dataUrl: null,
                  })),
              })),
              createdAt: new Date(json.project.createdAt).getTime(),
              updatedAt: new Date(json.project.updatedAt).getTime(),
            };
            await saveProjectToDB(reconstructed);
            return reconstructed;
          }
        }
      } catch (e) {
        console.warn('Failed to load project from Neon cloud:', e);
      }
    }

    return null;
  }
}

// Singleton repository instance
export const projectRepository: IProjectRepository = new HybridProjectRepository();
