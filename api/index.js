var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/db/index.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// src/lib/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  assets: () => assets,
  audioAssets: () => audioAssets,
  comments: () => comments,
  frames: () => frames,
  framesRelations: () => framesRelations,
  layers: () => layers,
  layersRelations: () => layersRelations,
  profiles: () => profiles,
  profilesRelations: () => profilesRelations,
  projectMembers: () => projectMembers,
  projectVersions: () => projectVersions,
  projects: () => projects,
  projectsRelations: () => projectsRelations,
  referenceAssets: () => referenceAssets,
  users: () => users,
  usersRelations: () => usersRelations
});
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
  index,
  unique
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => profiles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    fps: integer("fps").notNull(),
    backgroundType: text("background_type"),
    backgroundValue: text("background_value"),
    thumbnailUrl: text("thumbnail_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (table) => [
    index("idx_projects_owner").on(table.ownerId),
    index("idx_projects_updated_at").on(table.updatedAt)
  ]
);
var frames = pgTable(
  "frames",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    frameIndex: integer("frame_index").notNull(),
    exposure: integer("exposure").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("idx_frames_project").on(table.projectId),
    index("idx_frames_project_index").on(table.projectId, table.frameIndex)
  ]
);
var layers = pgTable(
  "layers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    frameId: uuid("frame_id").references(() => frames.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    layerIndex: integer("layer_index").notNull(),
    visible: boolean("visible").default(true).notNull(),
    locked: boolean("locked").default(false).notNull(),
    opacity: real("opacity").default(1).notNull(),
    bitmapPath: text("bitmap_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("idx_layers_frame").on(table.frameId)
  ]
);
var projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
    role: text("role").notNull(),
    // 'viewer' | 'editor'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique("uq_project_members").on(table.projectId, table.userId)
  ]
);
var assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
  assetType: text("asset_type"),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var audioAssets = pgTable("audio_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  startOffset: real("start_offset").default(0),
  volume: real("volume").default(1),
  duration: real("duration").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var referenceAssets = pgTable("reference_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  storagePath: text("storage_path").notNull(),
  opacity: real("opacity").default(0.5),
  scale: real("scale").default(1),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var projectVersions = pgTable("project_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
  versionNumber: integer("version_number").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
  frameId: uuid("frame_id").references(() => frames.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId]
  })
}));
var profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id]
  }),
  projects: many(projects),
  memberships: many(projectMembers)
}));
var projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [projects.ownerId],
    references: [profiles.id]
  }),
  frames: many(frames),
  members: many(projectMembers),
  assets: many(assets),
  audioAssets: many(audioAssets),
  referenceAssets: many(referenceAssets),
  versions: many(projectVersions),
  comments: many(comments)
}));
var framesRelations = relations(frames, ({ one, many }) => ({
  project: one(projects, {
    fields: [frames.projectId],
    references: [projects.id]
  }),
  layers: many(layers),
  comments: many(comments)
}));
var layersRelations = relations(layers, ({ one }) => ({
  frame: one(frames, {
    fields: [layers.frameId],
    references: [frames.id]
  })
}));

// src/lib/db/index.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
var cachedDb = null;
var cachedUrl = null;
function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is missing. Please add DATABASE_URL in your Vercel Project Settings > Environment Variables and redeploy."
    );
  }
  if (!cachedDb || cachedUrl !== connectionString) {
    const sql2 = neon(connectionString);
    cachedDb = drizzle(sql2, { schema: schema_exports });
    cachedUrl = connectionString;
  }
  return cachedDb;
}
var db = new Proxy({}, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  }
});

// src/server/api.ts
import { eq as eq2, desc, isNull, and as and2, sql } from "drizzle-orm";

// src/server/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";
function getJwtSecret() {
  return process.env.JWT_SECRET || "anim8_production_secret_key_change_in_env";
}
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}
async function authenticateRequest(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;
  const [user] = await db.select({ id: schema_exports.users.id, email: schema_exports.users.email }).from(schema_exports.users).where(eq(schema_exports.users.id, payload.userId));
  if (!user) return null;
  return payload;
}
async function checkProjectPermission(projectId, profileId, requiredRole = "viewer") {
  if (!profileId) {
    return { allowed: false, error: "Authentication required" };
  }
  const [proj] = await db.select({ id: schema_exports.projects.id, ownerId: schema_exports.projects.ownerId, deletedAt: schema_exports.projects.deletedAt }).from(schema_exports.projects).where(eq(schema_exports.projects.id, projectId));
  if (!proj || proj.deletedAt) {
    return { allowed: false, error: "Project not found" };
  }
  if (proj.ownerId === profileId) {
    return { allowed: true, role: "owner", isOwner: true };
  }
  if (requiredRole === "owner") {
    return { allowed: false, error: "Only the project owner can perform this action" };
  }
  const [member] = await db.select({ role: schema_exports.projectMembers.role }).from(schema_exports.projectMembers).where(
    and(
      eq(schema_exports.projectMembers.projectId, projectId),
      eq(schema_exports.projectMembers.userId, profileId)
    )
  );
  if (!member) {
    return { allowed: false, error: "You do not have access to this project" };
  }
  if (requiredRole === "editor" && member.role !== "editor") {
    return { allowed: false, error: "Editor permissions required" };
  }
  return { allowed: true, role: member.role, isOwner: false };
}

// src/server/api.ts
function ensureUuid(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-${hex.padEnd(12, "0")}`;
}
async function handleApiRequest(url, method, body, headers) {
  try {
    const parsedUrl = new URL(url, "http://localhost");
    const pathname = parsedUrl.pathname;
    const authHeader = headers?.authorization || headers?.Authorization;
    const authUser = await authenticateRequest(authHeader);
    if (pathname === "/api/health" && method === "GET") {
      try {
        await db.execute(sql`SELECT 1`);
        return {
          status: 200,
          data: { ok: true, database: "connected", service: "Anim8 Neon Cloud Backend" }
        };
      } catch (dbErr) {
        return {
          status: 503,
          data: { ok: false, database: "unavailable", error: "Database connection failed" }
        };
      }
    }
    if (pathname === "/api/auth/signup" && method === "POST") {
      const { email, password, displayName } = body || {};
      if (!email || !password || typeof email !== "string" || typeof password !== "string") {
        return { status: 400, data: { error: "Email and password are required" } };
      }
      if (password.length < 6) {
        return { status: 400, data: { error: "Password must be at least 6 characters long" } };
      }
      const normalizedEmail = email.trim().toLowerCase();
      const [existingUser] = await db.select().from(schema_exports.users).where(eq2(schema_exports.users.email, normalizedEmail));
      if (existingUser) {
        return { status: 409, data: { error: "An account with this email already exists" } };
      }
      const passwordHash = await hashPassword(password);
      const [newUser] = await db.insert(schema_exports.users).values({
        email: normalizedEmail,
        passwordHash
      }).returning();
      const [newProfile] = await db.insert(schema_exports.profiles).values({
        userId: newUser.id,
        displayName: displayName?.trim() || normalizedEmail.split("@")[0]
      }).returning();
      const token = signToken({
        userId: newUser.id,
        profileId: newProfile.id,
        email: newUser.email
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
            avatarUrl: newProfile.avatarUrl
          }
        }
      };
    }
    if (pathname === "/api/auth/login" && method === "POST") {
      const { email, password } = body || {};
      if (!email || !password) {
        return { status: 400, data: { error: "Email and password are required" } };
      }
      const normalizedEmail = email.trim().toLowerCase();
      const [user] = await db.select().from(schema_exports.users).where(eq2(schema_exports.users.email, normalizedEmail));
      if (!user) {
        return { status: 401, data: { error: "Invalid email or password" } };
      }
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return { status: 401, data: { error: "Invalid email or password" } };
      }
      let [profile] = await db.select().from(schema_exports.profiles).where(eq2(schema_exports.profiles.userId, user.id));
      if (!profile) {
        [profile] = await db.insert(schema_exports.profiles).values({
          userId: user.id,
          displayName: normalizedEmail.split("@")[0]
        }).returning();
      }
      const token = signToken({
        userId: user.id,
        profileId: profile.id,
        email: user.email
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
            avatarUrl: profile.avatarUrl
          }
        }
      };
    }
    if (pathname === "/api/auth/me" && method === "GET") {
      if (!authUser) {
        return { status: 401, data: { error: "Unauthenticated" } };
      }
      const [profile] = await db.select().from(schema_exports.profiles).where(eq2(schema_exports.profiles.id, authUser.profileId));
      return {
        status: 200,
        data: {
          user: {
            id: authUser.userId,
            profileId: authUser.profileId,
            email: authUser.email,
            displayName: profile?.displayName || authUser.email.split("@")[0],
            avatarUrl: profile?.avatarUrl || null
          }
        }
      };
    }
    if (pathname === "/api/projects" && method === "GET") {
      if (!authUser) {
        return { status: 200, data: { projects: [] } };
      }
      const ownedProjects = await db.select().from(schema_exports.projects).where(
        and2(
          eq2(schema_exports.projects.ownerId, authUser.profileId),
          isNull(schema_exports.projects.deletedAt)
        )
      ).orderBy(desc(schema_exports.projects.updatedAt));
      const memberProjects = await db.select({
        project: schema_exports.projects,
        role: schema_exports.projectMembers.role
      }).from(schema_exports.projectMembers).innerJoin(schema_exports.projects, eq2(schema_exports.projectMembers.projectId, schema_exports.projects.id)).where(
        and2(
          eq2(schema_exports.projectMembers.userId, authUser.profileId),
          isNull(schema_exports.projects.deletedAt)
        )
      );
      const allProjects = [
        ...ownedProjects.map((p) => ({ ...p, role: "owner" })),
        ...memberProjects.map((m) => ({ ...m.project, role: m.role }))
      ];
      allProjects.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return { status: 200, data: { projects: allProjects } };
    }
    if (pathname === "/api/projects" && method === "POST") {
      if (!authUser) {
        return { status: 401, data: { error: "Please sign in to save projects to the cloud" } };
      }
      const payload = body || {};
      const projId = payload.id ? ensureUuid(payload.id) : void 0;
      const [newProj] = await db.insert(schema_exports.projects).values({
        id: projId,
        ownerId: authUser.profileId,
        title: payload.name || payload.title || "Untitled Animation",
        width: payload.canvasWidth || payload.width || 1280,
        height: payload.canvasHeight || payload.height || 720,
        fps: payload.fps || 12,
        backgroundType: "color",
        backgroundValue: payload.canvasBgColor || "#ffffff",
        thumbnailUrl: payload.thumbnailUrl || null
      }).returning();
      return { status: 201, data: { project: newProj } };
    }
    const projectMatch = pathname.match(/^\/api\/projects\/([^\/]+)$/);
    if (projectMatch) {
      const rawId = projectMatch[1];
      const projId = ensureUuid(rawId);
      if (method === "GET") {
        const perm = await checkProjectPermission(projId, authUser?.profileId || null, "viewer");
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }
        const [proj] = await db.select().from(schema_exports.projects).where(and2(eq2(schema_exports.projects.id, projId), isNull(schema_exports.projects.deletedAt)));
        if (!proj) {
          return { status: 404, data: { error: "Project not found" } };
        }
        const frameRows = await db.select().from(schema_exports.frames).where(eq2(schema_exports.frames.projectId, projId)).orderBy(schema_exports.frames.frameIndex);
        const frameIds = frameRows.map((f) => f.id);
        let layerRows = [];
        if (frameIds.length > 0) {
          layerRows = await db.select().from(schema_exports.layers).orderBy(schema_exports.layers.layerIndex);
        }
        return {
          status: 200,
          data: {
            project: proj,
            frames: frameRows,
            layers: layerRows,
            role: perm.role
          }
        };
      }
      if (method === "PUT") {
        const perm = await checkProjectPermission(projId, authUser?.profileId || null, "editor");
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }
        const payload = body || {};
        const [updated] = await db.update(schema_exports.projects).set({
          title: payload.name || payload.title,
          width: payload.canvasWidth || payload.width,
          height: payload.canvasHeight || payload.height,
          fps: payload.fps,
          backgroundValue: payload.canvasBgColor,
          thumbnailUrl: payload.thumbnailUrl,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq2(schema_exports.projects.id, projId)).returning();
        return { status: 200, data: { project: updated } };
      }
      if (method === "DELETE") {
        const perm = await checkProjectPermission(projId, authUser?.profileId || null, "owner");
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }
        await db.update(schema_exports.projects).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq2(schema_exports.projects.id, projId));
        return { status: 200, data: { success: true } };
      }
    }
    if (pathname === "/api/sync" && method === "POST") {
      if (!authUser) {
        return { status: 401, data: { error: "Authentication required for cloud sync" } };
      }
      const operations = body?.operations || [];
      const processedIds = [];
      const failedErrors = {};
      for (const op of operations) {
        try {
          const projId = ensureUuid(op.projectId);
          const now = new Date(op.timestamp || Date.now());
          switch (op.operation) {
            case "CREATE_PROJECT": {
              const p = op.payload || {};
              await db.insert(schema_exports.projects).values({
                id: projId,
                ownerId: authUser.profileId,
                title: p.name || "Untitled Animation",
                width: p.canvasWidth || 1280,
                height: p.canvasHeight || 720,
                fps: p.fps || 12,
                backgroundType: "color",
                backgroundValue: p.canvasBgColor || "#ffffff",
                createdAt: new Date(p.createdAt || Date.now()),
                updatedAt: now
              }).onConflictDoUpdate({
                target: schema_exports.projects.id,
                set: {
                  title: p.name,
                  width: p.canvasWidth,
                  height: p.canvasHeight,
                  fps: p.fps,
                  backgroundValue: p.canvasBgColor,
                  updatedAt: now
                }
              });
              processedIds.push(op.id);
              break;
            }
            case "UPDATE_PROJECT": {
              const perm = await checkProjectPermission(projId, authUser.profileId, "editor");
              if (!perm.allowed) {
                const p = op.payload || {};
                await db.insert(schema_exports.projects).values({
                  id: projId,
                  ownerId: authUser.profileId,
                  title: p.name || "Untitled Animation",
                  width: p.canvasWidth || 1280,
                  height: p.canvasHeight || 720,
                  fps: p.fps || 12,
                  backgroundValue: p.canvasBgColor || "#ffffff",
                  updatedAt: now
                }).onConflictDoUpdate({
                  target: schema_exports.projects.id,
                  set: {
                    title: p.name,
                    width: p.canvasWidth,
                    height: p.canvasHeight,
                    fps: p.fps,
                    backgroundValue: p.canvasBgColor,
                    updatedAt: now
                  }
                });
              } else {
                const p = op.payload || {};
                await db.update(schema_exports.projects).set({
                  title: p.name,
                  width: p.canvasWidth,
                  height: p.canvasHeight,
                  fps: p.fps,
                  backgroundValue: p.canvasBgColor,
                  updatedAt: now
                }).where(eq2(schema_exports.projects.id, projId));
              }
              processedIds.push(op.id);
              break;
            }
            case "DELETE_PROJECT": {
              const perm = await checkProjectPermission(projId, authUser.profileId, "owner");
              if (perm.allowed) {
                await db.update(schema_exports.projects).set({ deletedAt: now }).where(eq2(schema_exports.projects.id, projId));
              }
              processedIds.push(op.id);
              break;
            }
            case "SAVE_FRAME":
            case "SAVE_LAYER":
            case "SAVE_STROKE": {
              const perm = await checkProjectPermission(projId, authUser.profileId, "editor");
              if (perm.allowed) {
                await db.update(schema_exports.projects).set({ updatedAt: now }).where(eq2(schema_exports.projects.id, projId));
              }
              processedIds.push(op.id);
              break;
            }
            default: {
              processedIds.push(op.id);
            }
          }
        } catch (err) {
          failedErrors[op.id] = err?.message || "Error processing operation";
        }
      }
      return {
        status: 200,
        data: {
          success: true,
          processedIds,
          failedErrors
        }
      };
    }
    if (pathname === "/api/assets/upload" && method === "POST") {
      if (!authUser) {
        return { status: 401, data: { error: "Authentication required to upload cloud assets" } };
      }
      const { projectId, assetType, mimeType, sizeBytes, metadata } = body || {};
      const projId = projectId ? ensureUuid(projectId) : void 0;
      if (projId) {
        const perm = await checkProjectPermission(projId, authUser.profileId, "editor");
        if (!perm.allowed) {
          return { status: 403, data: { error: perm.error } };
        }
      }
      const storagePath = `users/${authUser.profileId}/${projId || "global"}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      if (projId) {
        await db.insert(schema_exports.assets).values({
          projectId: projId,
          userId: authUser.profileId,
          assetType: assetType || "image",
          storagePath,
          mimeType: mimeType || "image/png",
          fileSize: sizeBytes || 0,
          metadata: metadata || {}
        });
      }
      return {
        status: 201,
        data: {
          storagePath,
          url: `/api/assets/${storagePath}`,
          sizeBytes,
          mimeType
        }
      };
    }
    return { status: 404, data: { error: "Not Found" } };
  } catch (error) {
    console.error("API Handler Error:", error);
    return { status: 500, data: { error: error?.message || "Internal Server Error" } };
  }
}

// api/index.ts
async function parseBody(req) {
  if (req.body !== void 0 && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return req.body;
      }
    }
    return req.body;
  }
  if (typeof req.on === "function") {
    return new Promise((resolve) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        if (!raw) {
          resolve(void 0);
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(raw);
        }
      });
      req.on("error", () => resolve(void 0));
    });
  }
  return void 0;
}
function sendResponse(res, status, data) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  };
  for (const [key, value] of Object.entries(headers)) {
    if (typeof res.setHeader === "function") {
      res.setHeader(key, value);
    }
  }
  if (typeof res.status === "function" && typeof res.json === "function") {
    res.status(status).json(data);
    return;
  }
  res.statusCode = status;
  res.end(JSON.stringify(data));
}
async function handler(req, res) {
  if (req.method === "OPTIONS") {
    if (typeof res.status === "function") {
      res.status(200).end();
    } else {
      res.statusCode = 200;
      res.end();
    }
    return;
  }
  try {
    let url = req.url || "/api/health";
    if (req.query?.path) {
      const pathSegment = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
      url = `/api/${pathSegment}`;
    }
    const method = req.method || "GET";
    const body = await parseBody(req);
    const headers = req.headers || {};
    const result = await handleApiRequest(url, method, body, headers);
    sendResponse(res, result.status, result.data);
  } catch (error) {
    console.error("Fatal Serverless API Error:", error);
    sendResponse(res, 500, {
      error: error?.message || "Internal Server Error"
    });
  }
}
export {
  handler as default
};
