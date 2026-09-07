import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, schema } from '../lib/db';
import { eq, and } from 'drizzle-orm';

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'anim8_production_secret_key_change_in_env';
}

export interface AuthUserPayload {
  userId: string;
  profileId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthUserPayload;
  } catch {
    return null;
  }
}

export async function authenticateRequest(authHeader?: string | null): Promise<AuthUserPayload | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, payload.userId));

  if (!user) return null;

  return payload;
}

export async function checkProjectPermission(
  projectId: string,
  profileId: string | null,
  requiredRole: 'viewer' | 'editor' | 'owner' = 'viewer'
): Promise<{ allowed: boolean; role?: string; isOwner?: boolean; error?: string }> {
  
  if (!profileId) {
    return { allowed: false, error: 'Authentication required' };
  }

  const [proj] = await db
    .select({ id: schema.projects.id, ownerId: schema.projects.ownerId, deletedAt: schema.projects.deletedAt })
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId));

  if (!proj || proj.deletedAt) {
    return { allowed: false, error: 'Project not found' };
  }

  if (proj.ownerId === profileId) {
    return { allowed: true, role: 'owner', isOwner: true };
  }

  if (requiredRole === 'owner') {
    return { allowed: false, error: 'Only the project owner can perform this action' };
  }

  const [member] = await db
    .select({ role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(
      and(
        eq(schema.projectMembers.projectId, projectId),
        eq(schema.projectMembers.userId, profileId)
      )
    );

  if (!member) {
    return { allowed: false, error: 'You do not have access to this project' };
  }

  if (requiredRole === 'editor' && member.role !== 'editor') {
    return { allowed: false, error: 'Editor permissions required' };
  }

  return { allowed: true, role: member.role, isOwner: false };
}
