import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/recipes.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Ensure favicon_url column exists (migration for existing DBs)
try {
  db.exec('ALTER TABLE recipes ADD COLUMN favicon_url VARCHAR(1024)');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

export default db;
