import { Database } from 'bun:sqlite';
import { getEnv } from '../lib/utils';

const db = new Database(getEnv('DB_FILE_PATH'));

export default db;
