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
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 0. USERS (Authentication & Account Management)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 1. PROFILES
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. PROJECTS
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    fps: integer('fps').notNull(),
    backgroundType: text('background_type'),
    backgroundValue: text('background_value'),
    thumbnailUrl: text('thumbnail_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_projects_owner').on(table.ownerId),
    index('idx_projects_updated_at').on(table.updatedAt),
  ]
);

// 3. FRAMES
export const frames = pgTable(
  'frames',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    frameIndex: integer('frame_index').notNull(),
    exposure: integer('exposure').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_frames_project').on(table.projectId),
    index('idx_frames_project_index').on(table.projectId, table.frameIndex),
  ]
);

// 4. LAYERS
export const layers = pgTable(
  'layers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    frameId: uuid('frame_id')
      .references(() => frames.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    layerIndex: integer('layer_index').notNull(),
    visible: boolean('visible').default(true).notNull(),
    locked: boolean('locked').default(false).notNull(),
    opacity: real('opacity').default(1.0).notNull(),
    bitmapPath: text('bitmap_path'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_layers_frame').on(table.frameId),
  ]
);

// 5. PROJECT MEMBERS
export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').notNull(), // 'viewer' | 'editor'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_project_members').on(table.projectId, table.userId),
  ]
);

// 6. ASSETS
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  assetType: text('asset_type'),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. AUDIO ASSETS
export const audioAssets = pgTable('audio_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type'),
  startOffset: real('start_offset').default(0),
  volume: real('volume').default(1),
  duration: real('duration').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. REFERENCE ASSETS
export const referenceAssets = pgTable('reference_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  storagePath: text('storage_path').notNull(),
  opacity: real('opacity').default(0.5),
  scale: real('scale').default(1),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. PROJECT VERSIONS
export const projectVersions = pgTable('project_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  versionNumber: integer('version_number').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 10. COMMENTS
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  frameId: uuid('frame_id').references(() => frames.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// RELATIONS
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
  projects: many(projects),
  memberships: many(projectMembers),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [projects.ownerId],
    references: [profiles.id],
  }),
  frames: many(frames),
  members: many(projectMembers),
  assets: many(assets),
  audioAssets: many(audioAssets),
  referenceAssets: many(referenceAssets),
  versions: many(projectVersions),
  comments: many(comments),
}));

export const framesRelations = relations(frames, ({ one, many }) => ({
  project: one(projects, {
    fields: [frames.projectId],
    references: [projects.id],
  }),
  layers: many(layers),
  comments: many(comments),
}));

export const layersRelations = relations(layers, ({ one }) => ({
  frame: one(frames, {
    fields: [layers.frameId],
    references: [frames.id],
  }),
}));
