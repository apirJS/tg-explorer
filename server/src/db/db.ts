import { Database } from 'bun:sqlite';
import { getEnv } from '../lib/utils';
import { drizzle } from 'drizzle-orm/bun-sqlite';

const sqlite = new Database(getEnv('DB_FILE_NAME'));
const db = drizzle({ client: sqlite });

export default db;
