import 'dotenv/config';
import { db } from '../src/lib/db/index';
import { users, profiles, projects, frames, layers, projectMembers } from '../src/lib/db/schema';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/server/auth';
import { eq } from 'drizzle-orm';

async function runTests() {
  console.log('======================================================');
  console.log('🚀 STARTING ANIM8 BACKEND & NEON INTEGRATION TESTS');
  console.log('======================================================\n');

  // 1. Password Hashing & Verification
  console.log('[1/6] Testing Password Hashing & Verification (bcryptjs)...');
  const rawPassword = 'SuperSecretAnim8Password!123';
  const hashed = await hashPassword(rawPassword);
  const isValid = await verifyPassword(rawPassword, hashed);
  const isInvalid = await verifyPassword('WrongPassword', hashed);
  if (!isValid || isInvalid) {
    throw new Error('Password hashing / verification check failed!');
  }
  console.log('  ✓ Password hashing and verification working correctly.');

  // 2. JWT Generation & Verification
  console.log('[2/6] Testing JWT Token Signing & Verification...');
  const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const token = signToken({
    id: testUserId,
    email: 'test_sync@anima8.studio',
    displayName: 'Test Sync Master',
  });
  const decoded = verifyToken(token);
  if (!decoded || decoded.id !== testUserId) {
    throw new Error('JWT token verification failed!');
  }
  console.log('  ✓ JWT token generation and verification passed.');

  // 3. Database Connection & Schema Verification
  console.log('[3/6] Testing Neon DB Connectivity and User Insertion...');
  const testEmail = `test_user_${Date.now()}@anima8.studio`;
  const createdUsers = await db
    .insert(users)
    .values({
      email: testEmail,
      passwordHash: hashed,
      displayName: 'Integration Test User',
    })
    .returning();

  const user = createdUsers[0];
  if (!user || user.email !== testEmail) {
    throw new Error('Failed to insert test user into Neon database!');
  }
  console.log(`  ✓ User created successfully in Neon DB with ID: ${user.id}`);

  // Create profile
  const createdProfiles = await db
    .insert(profiles)
    .values({
      userId: user.id,
      displayName: 'Integration Test User',
    })
    .returning();
  const profile = createdProfiles[0];
  console.log(`  ✓ User profile created in Neon DB with ID: ${profile.id}`);

  // 4. Project Creation & Cascade Relational Verification
  console.log('[4/6] Testing Project Creation, Frames & Layers...');
  const createdProjects = await db
    .insert(projects)
    .values({
      ownerId: profile.id,
      title: 'Integration Test Animation',
      width: 1920,
      height: 1080,
      fps: 24,
    })
    .returning();
  const project = createdProjects[0];
  console.log(`  ✓ Project created in Neon DB with ID: ${project.id}`);

  // Add Project Member (Owner)
  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: profile.id,
    role: 'owner',
  });

  // Add Frame
  const createdFrames = await db
    .insert(frames)
    .values({
      projectId: project.id,
      frameIndex: 0,
      exposure: 1,
    })
    .returning();
  const frame = createdFrames[0];

  // Add Layer
  await db.insert(layers).values({
    frameId: frame.id,
    layerIndex: 0,
    name: 'Rough Sketch Layer',
    opacity: 1.0,
    visible: true,
  });
  console.log('  ✓ Relational frames and layers created successfully.');

  // 5. Query Verification
  console.log('[5/6] Verifying Data Integrity via Relational Query...');
  const fetchedProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, profile.id));

  if (fetchedProjects.length === 0 || fetchedProjects[0].title !== 'Integration Test Animation') {
    throw new Error('Query verification failed!');
  }
  console.log('  ✓ Project query returned exact match from Neon PostgreSQL.');

  // 6. Cascade Cleanup
  console.log('[6/6] Cleaning up test records & verifying foreign key cascade...');
  await db.delete(projects).where(eq(projects.id, project.id));
  const remainingFrames = await db.select().from(frames).where(eq(frames.projectId, project.id));
  const remainingLayers = await db.select().from(layers).where(eq(layers.frameId, frame.id));
  if (remainingFrames.length !== 0 || remainingLayers.length !== 0) {
    throw new Error('Cascade deletion did not remove dependent frames or layers!');
  }
  await db.delete(users).where(eq(users.id, user.id));
  console.log('  ✓ Cascade deletion verified on frames and layers. Database is clean.');

  console.log('\n======================================================');
  console.log('🎉 ALL INTEGRATION & BACKEND TESTS PASSED 100%');
  console.log('======================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Integration test failed with error:', err);
  process.exit(1);
});
