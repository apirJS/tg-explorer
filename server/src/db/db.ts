import { Database } from 'bun:sqlite';
import { getEnv } from '../lib/utils';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { sql } from 'drizzle-orm';

const sqlite = new Database(getEnv('DB_FILE_NAME'));
const db = drizzle({ client: sqlite });
const query = sql`select ""`;
const result = db.get<{ text: string }>(query);
console.log(result);

export default db;
