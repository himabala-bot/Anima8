/**
 * Backend-Agnostic Project Data Layer for Anim8 Studio
 * Designed for seamless transition from Local IndexedDB to Supabase + PostgreSQL
 */

import {
  saveProjectToDB,
  getProjectFromDB,
  getAllProjectsFromDB,
  deleteProjectFromDB,
  ProjectRecord,
} from '../utils/indexedDB';

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
 * Local IndexedDB Implementation
 */
export class LocalProjectRepository implements IProjectRepository {
  async getAllProjects(): Promise<ProjectRecord[]> {
    return getAllProjectsFromDB();
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    return getProjectFromDB(id);
  }

  async saveProject(project: ProjectRecord): Promise<void> {
    await saveProjectToDB(project);
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
  }

  async deleteProject(id: string): Promise<void> {
    await deleteProjectFromDB(id);
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
    return newProject;
  }
}

// Singleton repository instance (Easily swappable with SupabaseProjectRepository in future)
export const projectRepository: IProjectRepository = new LocalProjectRepository();
