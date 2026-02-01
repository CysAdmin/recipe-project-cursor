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

// Ensure is_admin column exists on users; migrate existing users to admin
try {
  db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}
db.exec('UPDATE users SET is_admin = 1 WHERE is_admin = 0 OR is_admin IS NULL');

// Drop instructions column from recipes if present (SQLite 3.35+)
try {
  db.exec('ALTER TABLE recipes DROP COLUMN instructions');
} catch (e) {
  if (!e.message?.includes('no such column') && !e.message?.includes('syntax error')) throw e;
}

// Tags on recipes (JSON array of keys: quick, easy, after_work, vegetarian, comfort_food, summer, reheatable)
try {
  db.exec("ALTER TABLE recipes ADD COLUMN tags TEXT DEFAULT '[]'");
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

export default db;
