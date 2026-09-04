/**
 * Server-Side REST API Handlers for Anim8 Cloud Backend
 * Connects securely to Neon PostgreSQL via Drizzle ORM.
 * Runs strictly in server-side Node environment (e.g. Vite server middleware / Next.js API).
 */

import { db, schema } from '../lib/db';
import { eq, desc, isNull, and, sql } from 'drizzle-orm';

// Helper to convert any custom ID string to a deterministic/valid UUID if needed
function ensureUuid(id: string): string {
  // If it's already a valid UUID format (8-4-4-4-12 hex), return as is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;

  // Otherwise create a deterministic UUID-v4-like string from hash
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
  body?: any
): Promise<{ status: number; data: any }> {
  try {
    const parsedUrl = new URL(url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    // 1. Health Check
    if (pathname === '/api/health' && method === 'GET') {
      await db.execute(sql`SELECT 1`);
      return { status: 200, data: { ok: true, database: 'connected', service: 'Anim8 Neon Cloud Backend' } };
    }

    // 2. Projects List
    if (pathname === '/api/projects' && method === 'GET') {
      const rows = await db
        .select()
        .from(schema.projects)
        .where(isNull(schema.projects.deletedAt))
        .orderBy(desc(schema.projects.updatedAt));

      return { status: 200, data: { projects: rows } };
    }

    // 3. Create Project
    if (pathname === '/api/projects' && method === 'POST') {
      const payload = body || {};
      const projId = payload.id ? ensureUuid(payload.id) : undefined;
      const [newProj] = await db
        .insert(schema.projects)
        .values({
          id: projId,
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

    // 4. Single Project Operations: /api/projects/:id
    const projectMatch = pathname.match(/^\/api\/projects\/([^\/]+)$/);
    if (projectMatch) {
      const rawId = projectMatch[1];
      const projId = ensureUuid(rawId);

      if (method === 'GET') {
        const [proj] = await db
          .select()
          .from(schema.projects)
          .where(and(eq(schema.projects.id, projId), isNull(schema.projects.deletedAt)));

        if (!proj) {
          return { status: 404, data: { error: 'Project not found' } };
        }

        // Fetch associated frames & layers
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
          },
        };
      }

      if (method === 'PUT') {
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
        await db
          .update(schema.projects)
          .set({ deletedAt: new Date() })
          .where(eq(schema.projects.id, projId));

        return { status: 200, data: { success: true } };
      }
    }

    // 5. Batch Sync Queue: /api/sync
    if (pathname === '/api/sync' && method === 'POST') {
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
              processedIds.push(op.id);
              break;
            }

            case 'DELETE_PROJECT': {
              await db
                .update(schema.projects)
                .set({ deletedAt: now })
                .where(eq(schema.projects.id, projId));
              processedIds.push(op.id);
              break;
            }

            case 'SAVE_FRAME':
            case 'SAVE_LAYER':
            case 'SAVE_STROKE': {
              // Mark project as updated in Neon
              await db
                .update(schema.projects)
                .set({ updatedAt: now })
                .where(eq(schema.projects.id, projId));
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

    return { status: 404, data: { error: 'Not Found' } };
  } catch (error: any) {
    console.error('API Handler Error:', error);
    return { status: 500, data: { error: error?.message || 'Internal Server Error' } };
  }
}
