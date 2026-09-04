/**
 * Robust IndexedDB storage wrapper for Anim8 2D Studio projects
 * Handles offline persistence, fast-path drawing storage, and background cloud synchronization queues.
 */

export interface ProjectRecord {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string | null;
  fps: number;
  frames: any[];
  audioTrack?: any | null;
  referenceImage?: any | null;
  thumbnailDataUrl?: string | null;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export type SyncOpType =
  | 'CREATE_PROJECT'
  | 'UPDATE_PROJECT'
  | 'DELETE_PROJECT'
  | 'SAVE_STROKE'
  | 'SAVE_FRAME'
  | 'SAVE_LAYER';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncQueueItem {
  id: string;
  operation: SyncOpType;
  entityType: 'project' | 'frame' | 'layer' | 'stroke';
  entityId: string;
  projectId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  status: SyncStatus;
  lastError?: string;
}

const DB_NAME = 'Anim8DB_v1';
const LEGACY_DB_NAME = 'ChibiMotionDB_v2';
const STORE_PROJECTS = 'projects';
const STORE_SYNC_QUEUE = 'sync_queue';
const DB_VERSION = 1;

let isMigrated = false;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // 1. Projects Store
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const projStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        projStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 2. Sync Queue Store
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      if (!isMigrated) {
        isMigrated = true;
        await migrateFromLegacyDB(db);
      }
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Migration helper: seamlessly copies projects from old database if found
 */
async function migrateFromLegacyDB(targetDb: IDBDatabase): Promise<void> {
  try {
    const legacyReq = indexedDB.open(LEGACY_DB_NAME);
    legacyReq.onsuccess = () => {
      const legacyDb = legacyReq.result;
      if (!legacyDb.objectStoreNames.contains('projects')) {
        legacyDb.close();
        return;
      }
      const tx = legacyDb.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const items = getAllReq.result as ProjectRecord[];
        if (items && items.length > 0) {
          const writeTx = targetDb.transaction(STORE_PROJECTS, 'readwrite');
          const writeStore = writeTx.objectStore(STORE_PROJECTS);
          for (const item of items) {
            writeStore.put(item);
          }
        }
        legacyDb.close();
      };
      getAllReq.onerror = () => legacyDb.close();
    };
    legacyReq.onerror = () => {};
  } catch {}
}

// -------------------------------------------------------------
// PROJECT STORE OPERATIONS
// -------------------------------------------------------------

export async function saveProjectToDB(project: ProjectRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const item = { ...project, updatedAt: project.updatedAt || Date.now() };
    const req = store.put(item);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getProjectFromDB(id: string): Promise<ProjectRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllProjectsFromDB(): Promise<ProjectRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();

    req.onsuccess = () => {
      const list = (req.result || []) as ProjectRecord[];
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProjectFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROJECTS, STORE_SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(id);

    // Also remove queued operations for this project
    const queueStore = tx.objectStore(STORE_SYNC_QUEUE);
    const idx = queueStore.index('projectId');
    const qReq = idx.getAllKeys(id);
    qReq.onsuccess = () => {
      for (const key of qReq.result) {
        queueStore.delete(key);
      }
      resolve();
    };
    qReq.onerror = () => resolve();
  });
}

// -------------------------------------------------------------
// SYNC QUEUE STORE OPERATIONS
// -------------------------------------------------------------

export async function enqueueSyncOp(item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount'>): Promise<SyncQueueItem> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      status: 'pending',
      retryCount: 0,
    };
    const req = store.put(queueItem);
    req.onsuccess = () => resolve(queueItem);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingSyncOps(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const idx = store.index('status');
    const req = idx.getAll('pending');

    req.onsuccess = () => {
      const list = (req.result || []) as SyncQueueItem[];
      list.sort((a, b) => a.timestamp - b.timestamp);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateSyncOp(item: SyncQueueItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function removeSyncOp(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getSyncQueueCount(): Promise<{ pending: number; failed: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const req = store.getAll();
    req.onsuccess = () => {
      const all = (req.result || []) as SyncQueueItem[];
      let pending = 0;
      let failed = 0;
      for (const item of all) {
        if (item.status === 'pending' || item.status === 'syncing') pending++;
        if (item.status === 'failed') failed++;
      }
      resolve({ pending, failed });
    };
    req.onerror = () => reject(req.error);
  });
}
