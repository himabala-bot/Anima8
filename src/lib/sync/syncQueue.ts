/**
 * Sync Queue Engine for Anim8 Studio
 * Manages background asynchronous synchronization between IndexedDB and Neon PostgreSQL.
 * Guarantees that local editor operations never block on network or database queries.
 */

import {
  enqueueSyncOp,
  getPendingSyncOps,
  removeSyncOp,
  updateSyncOp,
  SyncQueueItem,
  SyncOpType,
} from '../../utils/indexedDB';

export type CloudSyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncEngineListener {
  (state: CloudSyncState, pendingCount: number): void;
}

class SyncEngine {
  private isProcessing = false;
  private syncTimer: any = null;
  private listeners: Set<SyncEngineListener> = new Set();
  private currentState: CloudSyncState = 'idle';
  private authToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify('idle', 0);
        this.drain();
      });
      window.addEventListener('offline', () => {
        this.notify('offline', 0);
      });
    }
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState, 0);
    return () => this.listeners.delete(listener);
  }

  private notify(state: CloudSyncState, count: number) {
    this.currentState = state;
    for (const listener of this.listeners) {
      listener(state, count);
    }
  }

  /**
   * Enqueue a new mutation to sync queue and trigger background sync
   */
  public async enqueue(
    operation: SyncOpType,
    entityType: 'project' | 'frame' | 'layer' | 'stroke',
    entityId: string,
    projectId: string,
    payload: any
  ): Promise<void> {
    try {
      await enqueueSyncOp({
        operation,
        entityType,
        entityId,
        projectId,
        payload,
        timestamp: Date.now(),
      });
      this.triggerSync();
    } catch (e) {
      console.warn('Failed to enqueue sync operation', e);
    }
  }

  public triggerSync(delayMs = 400): void {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) {
      this.notify('offline', 0);
      return;
    }

    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.drain();
    }, delayMs);
  }

  /**
   * Drain pending queue items by batching to server /api/sync
   */
  public async drain(): Promise<void> {
    if (this.isProcessing) return;
    if (typeof window === 'undefined' || !navigator.onLine) {
      this.notify('offline', 0);
      return;
    }

    // Only sync to cloud if authenticated
    if (!this.authToken) {
      this.notify('idle', 0);
      return;
    }

    this.isProcessing = true;
    try {
      const items = await getPendingSyncOps();
      if (items.length === 0) {
        this.notify('synced', 0);
        this.isProcessing = false;
        return;
      }

      this.notify('syncing', items.length);

      // Process in batches of up to 25 items
      const batch = items.slice(0, 25);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ operations: batch }),
      });

      if (!res.ok) {
        throw new Error(`Sync API responded with status ${res.status}`);
      }

      const result = await res.json();
      const processedIds: string[] = result.processedIds || [];
      const failedMap: Record<string, string> = result.failedErrors || {};

      for (const item of batch) {
        if (processedIds.includes(item.id)) {
          await removeSyncOp(item.id);
        } else {
          item.retryCount = (item.retryCount || 0) + 1;
          item.status = item.retryCount > 5 ? 'failed' : 'pending';
          item.lastError = failedMap[item.id] || 'Unknown sync error';
          await updateSyncOp(item);
        }
      }

      // Check if more items remain in queue
      const remaining = await getPendingSyncOps();
      if (remaining.length > 0) {
        this.isProcessing = false;
        this.triggerSync(1000);
      } else {
        this.notify('synced', 0);
      }
    } catch (err: any) {
      console.warn('Sync engine encountered error, will retry later:', err?.message || err);
      this.notify('error', 0);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
