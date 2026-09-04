/**
 * Server-Side REST API Handlers for Anim8 Cloud Backend
 * Connects securely to Neon PostgreSQL via Drizzle ORM and authenticates with JWT.
 * Runs strictly in server-side Node environment (e.g. Vite server middleware / Next.js API).
 */

import { db, schema } from '../lib/db';
import { eq, desc, isNull, and, or, sql } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  signToken,
  authenticateRequest,
  checkProjectPermission,
} from './auth';

// Helper to convert any custom ID string to a deterministic/valid UUID if needed
function ensureUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padEnd(12, '0')}`;
}

export async function handleApiRequest(
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string | undefined>
): Promise<{ status: number; data: any }> {
  try {
    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;
    const authHeader = headers?.authorization || headers?.Authorization;
    const authUser = await authenticateRequest(authHeader);

    // 1. Health Check
    if ((pathname === '/api/health' || pathname === '/api' || pathname === '/api/') && method === 'GET') {
      try {
        await db.execute(sql`SELECT 1`);
        return {
          status: 200,
          data: { ok: true, database: 'connected', service: 'Anim8 Neon Cloud Backend' },
        };
      } catch (dbErr: any) {
        return {
          status: 503,
          data: { ok: false, database: 'unavailable', error: dbErr?.message || 'Database connection failed' },
        };
      }
    }

    // 2. Authentication: Sign Up
    if (pathname === '/api/auth/signup' && method === 'POST') {
      const { email, password, displayName } = body || {};
      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return { status: 400, data: { error: 'Email and password are required' } };
      }
      if (password.length < 6) {
        return { status: 400, data: { error: 'Password must be at least 6 characters long' } };
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail));

      if (existingUser) {
        return { status: 409, data: { error: 'An account with this email already exists' } };
      }

      // Hash password and create user + profile
      const passwordHash = await hashPassword(password);
      const [newUser] = await db
        .insert(schema.users)
        .values({
          email: normalizedEmail,
          passwordHash,
        })
        .returning();

      const [newProfile] = await db
        .insert(schema.profiles)
        .values({
          userId: newUser.id,
          displayName: displayName?.trim() || normalizedEmail.split('@')[0],
        })
        .returning();

      const token = signToken({
        userId: newUser.id,
        profileId: newProfile.id,
        email: newUser.email,
      });

      return {
        status: 201,
        data: {
          token,
          user: {
            id: newUser.id,
            profileId: newProfile.id,
            email: newUser.email,
            displayName: newProfile.displayName,
            avatarUrl: newProfile.avatarUrl,
          },
        },
      };
    }

    // 3. Authentication: Log In
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = body || {};
      if (!email || !password) {
        return { status: 400, data: { error: 'Email and password are required' } };
      }

      const normalizedEmail = email.trim().toLowerCase();
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail));

      if (!user) {
        return { status: 401, data: { error: 'Invalid email or password' } };
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return { status: 401, data: { error: 'Invalid email or password' } };
      }

      // Fetch or auto-create profile
      let [profile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, user.id));

      if (!profile) {
        [profile] = await db
          .insert(schema.profiles)
          .values({
            userId: user.id,
            displayName: normalizedEmail.split('@')[0],
          })
          .returning();
      }

      const token = signToken({
        userId: user.id,
        profileId: profile.id,
        email: user.email,
      });

      return {
        status: 200,
        data: {
          token,
          user: {
            id: user.id,
            profileId: profile.id,
            email: user.email,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          },
        },
      };
    }

    // 4. Authentication: Get Current Profile (/api/auth/me)
    if (pathname === '/api/auth/me' && method === 'GET') {
      if (!authUser) {
        return { status: 401, data: { error: 'Unauthenticated' } };
      }

      const [profile] = await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, authUser.profileId));

      return {
        status: 200,
        data: {
          user: {
            id: authUser.userId,
            profileId: authUser.profileId,
            email: authUser.email,
            displayName: profile?.displayName || authUser.email.split('@')[0],
            avatarUrl: profile?.avatarUrl || null,
          },
        },
      };
    }

    // 5. Projects List (Protected or Guest Accessible)
    if (pathname === '/api/projects' && method === 'GET') {
      if (!authUser) {
        // Unauthenticated guests only see local projects on client
        return { status: 200, data: { projects: [] } };
      }

      // Find projects owned by user or shared via project_members
      const ownedProjects = await db
        .select()
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.ownerId, authUser.profileId),
            isNull(schema.projects.deletedAt)
          )
        )
        .orderBy(desc(schema.projects.updatedAt));

      const memberProjects = await db
        .select({
          project: schema.projects,
          role: schema.projectMembers.role,
        })
        .from(schema.projectMembers)
        .innerJoin(schema.projects, eq(schema.projectMembers.projectId, schema.projects.id))
        .where(
          and(
            eq(schema.projectMembers.userId, authUser.profileId),
            isNull(schema.projects.deletedAt)
          )
        );

      const allProjects = [
        ...ownedProjects.map((p) => ({ ...p, role: 'owner' })),
        ...memberProjects.map((m) => ({ ...m.project, role: m.role })),
      ];

      allProjects.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return { status: 200, data: { projects: allProjects } };
    }

    // 6. Create Project
    if (pathname === '/api/projects' && method === 'POST') {
      if (!authUser) {
        return { status: 401, data: { error: 'Please sign in to save projects to the cloud' } };
      }

      const payload = body || {};
      const projId = payload.id ? ensureUuid(payload.id) : undefined;
      const [newProj] = await db
        .insert(schema.projects)
        .values({
          id: projId,
          ownerId: authUser.profileId,
          title: payload.name || payload.title || 'Untitled Animation',
          width: payload.canvasWidth || payload.width || 1280,
          height: payload.canvasHeight || payload.height || 720,
          fps: payload.fps || 12,
          backgroundType: 'color',
          backgroundValue: payload.canvasBgColor || '#ffffff',
          thumbnailUrl: payload.thumbnailUrl || null,
        })
        .returning();

      return { status: 201, data: { project: newProj } };
    }

    // 7. Single Project Operations: /api/projects/:id
    const projectMatch = pathname.match(/^\/api\/projects\/([^\/]+)$/);
    if (projectMatch) {
      const rawId = projectMatch[1];
      const projId = ensureUuid(rawId);

      if (method === 'GET') {
        const perm = await checkProjectPermission(projId, authUser?.profileId || null, 'viewer');
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }

        const [proj] = await db
          .select()
          .from(schema.projects)
          .where(and(eq(schema.projects.id, projId), isNull(schema.projects.deletedAt)));

        if (!proj) {
          return { status: 404, data: { error: 'Project not found' } };
        }

        const frameRows = await db
          .select()
          .from(schema.frames)
          .where(eq(schema.frames.projectId, projId))
          .orderBy(schema.frames.frameIndex);

        const frameIds = frameRows.map((f) => f.id);
        let layerRows: any[] = [];
        if (frameIds.length > 0) {
          layerRows = await db
            .select()
            .from(schema.layers)
            .orderBy(schema.layers.layerIndex);
        }

        return {
          status: 200,
          data: {
            project: proj,
            frames: frameRows,
            layers: layerRows,
            role: perm.role,
          },
        };
      }

      if (method === 'PUT') {
        const perm = await checkProjectPermission(projId, authUser?.profileId || null, 'editor');
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }

        const payload = body || {};
        const [updated] = await db
          .update(schema.projects)
          .set({
            title: payload.name || payload.title,
            width: payload.canvasWidth || payload.width,
            height: payload.canvasHeight || payload.height,
            fps: payload.fps,
            backgroundValue: payload.canvasBgColor,
            thumbnailUrl: payload.thumbnailUrl,
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, projId))
          .returning();

        return { status: 200, data: { project: updated } };
      }

      if (method === 'DELETE') {
        const perm = await checkProjectPermission(projId, authUser?.profileId || null, 'owner');
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }

        await db
          .update(schema.projects)
          .set({ deletedAt: new Date() })
          .where(eq(schema.projects.id, projId));

        return { status: 200, data: { success: true } };
      }
    }

    // 8. Batch Sync Queue: /api/sync
    if (pathname === '/api/sync' && method === 'POST') {
      if (!authUser) {
        return { status: 401, data: { error: 'Authentication required for cloud sync' } };
      }

      const operations: any[] = body?.operations || [];
      const processedIds: string[] = [];
      const failedErrors: Record<string, string> = {};

      for (const op of operations) {
        try {
          const projId = ensureUuid(op.projectId);
          const now = new Date(op.timestamp || Date.now());

          switch (op.operation) {
            case 'CREATE_PROJECT': {
              const p = op.payload || {};
              await db
                .insert(schema.projects)
                .values({
                  id: projId,
                  ownerId: authUser.profileId,
                  title: p.name || 'Untitled Animation',
                  width: p.canvasWidth || 1280,
                  height: p.canvasHeight || 720,
                  fps: p.fps || 12,
                  backgroundType: 'color',
                  backgroundValue: p.canvasBgColor || '#ffffff',
                  createdAt: new Date(p.createdAt || Date.now()),
                  updatedAt: now,
                })
                .onConflictDoUpdate({
                  target: schema.projects.id,
                  set: {
                    title: p.name,
                    width: p.canvasWidth,
                    height: p.canvasHeight,
                    fps: p.fps,
                    backgroundValue: p.canvasBgColor,
                    updatedAt: now,
                  },
                });
              processedIds.push(op.id);
              break;
            }

            case 'UPDATE_PROJECT': {
              const perm = await checkProjectPermission(projId, authUser.profileId, 'editor');
              if (!perm.allowed) {
                // If the project doesn't exist yet in cloud, create it under current user
                const p = op.payload || {};
                await db
                  .insert(schema.projects)
                  .values({
                    id: projId,
                    ownerId: authUser.profileId,
                    title: p.name || 'Untitled Animation',
                    width: p.canvasWidth || 1280,
                    height: p.canvasHeight || 720,
                    fps: p.fps || 12,
                    backgroundValue: p.canvasBgColor || '#ffffff',
                    updatedAt: now,
                  })
                  .onConflictDoUpdate({
                    target: schema.projects.id,
                    set: {
                      title: p.name,
                      width: p.canvasWidth,
                      height: p.canvasHeight,
                      fps: p.fps,
                      backgroundValue: p.canvasBgColor,
                      updatedAt: now,
                    },
                  });
              } else {
                const p = op.payload || {};
                await db
                  .update(schema.projects)
                  .set({
                    title: p.name,
                    width: p.canvasWidth,
                    height: p.canvasHeight,
                    fps: p.fps,
                    backgroundValue: p.canvasBgColor,
                    updatedAt: now,
                  })
                  .where(eq(schema.projects.id, projId));
              }
              processedIds.push(op.id);
              break;
            }

            case 'DELETE_PROJECT': {
              const perm = await checkProjectPermission(projId, authUser.profileId, 'owner');
              if (perm.allowed) {
                await db
                  .update(schema.projects)
                  .set({ deletedAt: now })
                  .where(eq(schema.projects.id, projId));
              }
              processedIds.push(op.id);
              break;
            }

            case 'SAVE_FRAME':
            case 'SAVE_LAYER':
            case 'SAVE_STROKE': {
              const perm = await checkProjectPermission(projId, authUser.profileId, 'editor');
              if (perm.allowed) {
                await db
                  .update(schema.projects)
                  .set({ updatedAt: now })
                  .where(eq(schema.projects.id, projId));
              }
              processedIds.push(op.id);
              break;
            }

            default: {
              processedIds.push(op.id);
            }
          }
        } catch (err: any) {
          failedErrors[op.id] = err?.message || 'Error processing operation';
        }
      }

      return {
        status: 200,
        data: {
          success: true,
          processedIds,
          failedErrors,
        },
      };
    }

    // 9. Asset Upload: /api/assets/upload
    if (pathname === '/api/assets/upload' && method === 'POST') {
      if (!authUser) {
        return { status: 401, data: { error: 'Authentication required to upload cloud assets' } };
      }

      const { projectId, assetType, mimeType, sizeBytes, metadata } = body || {};
      const projId = projectId ? ensureUuid(projectId) : undefined;

      if (projId) {
        const perm = await checkProjectPermission(projId, authUser.profileId, 'editor');
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }
      }

      const storagePath = `users/${authUser.profileId}/${projId || 'global'}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      if (projId) {
        await db.insert(schema.assets).values({
          projectId: projId,
          userId: authUser.profileId,
          assetType: assetType || 'image',
          storagePath,
          mimeType: mimeType || 'image/png',
          fileSize: sizeBytes || 0,
          metadata: metadata || {},
        });
      }

      return {
        status: 201,
        data: {
          storagePath,
          url: `/api/assets/${storagePath}`,
          sizeBytes,
          mimeType,
        },
      };
    }

    return { status: 404, data: { error: 'Not Found' } };
  } catch (error: any) {
    console.error('API Handler Error:', error);
    return { status: 500, data: { error: error?.message || 'Internal Server Error' } };
  }
}
