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

// Tags per user (user_recipes.tags) — only visible to the user who set them
try {
  db.exec("ALTER TABLE user_recipes ADD COLUMN tags TEXT DEFAULT '[]'");
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

// Email verification (users)
try {
  db.exec('ALTER TABLE users ADD COLUMN email_verified_at DATETIME');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}
try {
  db.exec('ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}
try {
  db.exec('ALTER TABLE users ADD COLUMN verification_token_expires_at DATETIME');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}
// Mark existing users (no verification token) as verified so they can still log in
try {
  db.exec(
    "UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL AND (verification_token IS NULL OR verification_token = '')"
  );
} catch (_) {}

// Password reset (users)
try {
  db.exec('ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255)');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}
try {
  db.exec('ALTER TABLE users ADD COLUMN password_reset_token_expires_at DATETIME');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

// Onboarding (users) — first-time user tour
try {
  db.exec('ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

// User rating 1–5 per recipe (user_recipes)
try {
  db.exec('ALTER TABLE user_recipes ADD COLUMN rating INTEGER');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

// Collections (user-owned recipe collections)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (e) {
  if (!e.message.includes('duplicate column name') && !e.message?.includes('already exists')) throw e;
}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collection_recipes (
      collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
      recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (collection_id, recipe_id)
    )
  `);
} catch (e) {
  if (!e.message.includes('duplicate column name') && !e.message?.includes('already exists')) throw e;
}

export default db;
