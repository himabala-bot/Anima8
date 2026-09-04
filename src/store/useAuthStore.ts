/**
 * Client-Side Authentication State Manager for Anim8
 * Adheres strictly to Zero localStorage rule: persists session tokens solely in IndexedDB.
 */

import { create } from 'zustand';
import {
  saveAuthSessionToDB,
  getAuthSessionFromDB,
  clearAuthSessionFromDB,
  getAllProjectsFromDB,
} from '../utils/indexedDB';
import { syncEngine } from '../lib/sync/syncQueue';

export interface AuthUser {
  id: string;
  profileId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  claimLocalProjects: () => Promise<number>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: async () => {
    try {
      const session = await getAuthSessionFromDB();
      if (session && session.token && session.user) {
        // Validate token with server
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({
              user: data.user || session.user,
              token: session.token,
              isAuthenticated: true,
              isLoading: false,
            });
            syncEngine.setAuthToken(session.token);
            syncEngine.triggerSync();
            return;
          }
        } catch {}
      }
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        data = { error: text || `Server error (HTTP ${res.status})` };
      }

      if (!res.ok) {
        const errMsg = data.error || `Login failed (HTTP ${res.status})`;
        set({ error: errMsg, isLoading: false });
        return { success: false, error: errMsg };
      }

      await saveAuthSessionToDB({
        token: data.token,
        user: data.user,
      });

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      syncEngine.setAuthToken(data.token);
      syncEngine.triggerSync();

      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error during login';
      set({ error: errMsg, isLoading: false });
      return { success: false, error: errMsg };
    }
  },

  signup: async (email: string, password: string, displayName?: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => '');
        data = { error: text || `Server error (HTTP ${res.status})` };
      }

      if (!res.ok) {
        const errMsg = data.error || `Sign up failed (HTTP ${res.status})`;
        set({ error: errMsg, isLoading: false });
        return { success: false, error: errMsg };
      }

      await saveAuthSessionToDB({
        token: data.token,
        user: data.user,
      });

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      syncEngine.setAuthToken(data.token);
      syncEngine.triggerSync();

      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error during signup';
      set({ error: errMsg, isLoading: false });
      return { success: false, error: errMsg };
    }
  },

  logout: async () => {
    await clearAuthSessionFromDB();
    syncEngine.setAuthToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  /**
   * Safe migration helper: uploads existing local projects created in guest mode
   * to the newly signed-in account without overwriting or losing work.
   */
  claimLocalProjects: async () => {
    const { isAuthenticated } = get();
    if (!isAuthenticated) return 0;

    try {
      const localProjects = await getAllProjectsFromDB();
      let count = 0;
      for (const proj of localProjects) {
        syncEngine.enqueue('CREATE_PROJECT', 'project', proj.id, proj.id, proj);
        count++;
      }
      syncEngine.triggerSync();
      return count;
    } catch {
      return 0;
    }
  },

  clearError: () => set({ error: null }),
}));
