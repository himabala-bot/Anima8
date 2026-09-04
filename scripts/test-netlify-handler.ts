import 'dotenv/config';
import { handler } from '../netlify/functions/api';

async function testNetlifyHandler() {
  console.log('--- TESTING NETLIFY FUNCTION HANDLER ---');

  // 1. Health check via Netlify Event
  console.log('[1/4] Testing GET /.netlify/functions/api/health...');
  const healthEvent: any = {
    path: '/.netlify/functions/api/health',
    httpMethod: 'GET',
    headers: {},
  };
  const healthRes = await (handler as any)(healthEvent, {});
  console.log('Health Response Status:', healthRes.statusCode);
  console.log('Health Response Body:', healthRes.body);

  if (healthRes.statusCode !== 200 || !healthRes.body.includes('Anim8 Neon Cloud Backend')) {
    throw new Error('Netlify health endpoint test failed!');
  }
  console.log('✓ Netlify Health check passed!');

  // 2. CORS Preflight OPTIONS Check
  console.log('[2/4] Testing OPTIONS Preflight...');
  const optionsEvent: any = {
    path: '/api/projects',
    httpMethod: 'OPTIONS',
    headers: {},
  };
  const optionsRes = await (handler as any)(optionsEvent, {});
  if (optionsRes.statusCode !== 200) {
    throw new Error('Netlify OPTIONS preflight failed!');
  }
  console.log('✓ Netlify CORS preflight passed!');

  // 3. Auth Check without token (GET /api/auth/me should return 401)
  console.log('[3/4] Testing Unauthenticated Route (GET /api/auth/me without token)...');
  const unauthEvent: any = {
    path: '/.netlify/functions/api/auth/me',
    httpMethod: 'GET',
    headers: {},
  };
  const unauthRes = await (handler as any)(unauthEvent, {});
  if (unauthRes.statusCode !== 401) {
    throw new Error(`Expected 401 unauthenticated, got ${unauthRes.statusCode}`);
  }
  console.log('✓ Unauthenticated request correctly returned 401 Unauthenticated.');

  // 4. Guest Projects Query (GET /api/projects without token returns empty array)
  console.log('[4/4] Testing Guest Projects Query (GET /api/projects)...');
  const guestProjectsEvent: any = {
    path: '/.netlify/functions/api/projects',
    httpMethod: 'GET',
    headers: {},
  };
  const guestRes = await (handler as any)(guestProjectsEvent, {});
  if (guestRes.statusCode !== 200 || !guestRes.body.includes('projects')) {
    throw new Error(`Expected 200 with empty projects list, got ${guestRes.statusCode}`);
  }
  console.log('✓ Guest projects query correctly returned 200 with empty list.');

  console.log('\n======================================================');
  console.log('🎉 ALL NETLIFY FUNCTION TESTS PASSED 100%');
  console.log('======================================================');
  process.exit(0);
}

testNetlifyHandler().catch((err) => {
  console.error('❌ Netlify Handler test failed:', err);
  process.exit(1);
});
