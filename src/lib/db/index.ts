import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

let cachedDb: NeonHttpDatabase<typeof schema> | null = null;
let cachedUrl: string | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL environment variable is missing. Please add DATABASE_URL in your Vercel Project Settings > Environment Variables and redeploy.'
    );
  }

  if (!cachedDb || cachedUrl !== connectionString) {
    const sql = neon(connectionString);
    cachedDb = drizzle(sql, { schema });
    cachedUrl = connectionString;
  }

  return cachedDb;
}

// Proxy exports `db` so existing queries like `db.select()`, `db.insert()` work transparently
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export { schema };
