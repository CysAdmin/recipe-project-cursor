import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/recipes.db');
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url VARCHAR(1024) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    ingredients TEXT NOT NULL,
    instructions TEXT,
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    image_url VARCHAR(1024),
    created_by_user_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_recipes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    is_favorite INTEGER DEFAULT 0,
    personal_notes TEXT,
    saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
  );

  CREATE TABLE IF NOT EXISTS meal_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    servings INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shopping_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    ingredients_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_recipes_source_url ON recipes(source_url);
  CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
  CREATE INDEX IF NOT EXISTS idx_user_recipes_user ON user_recipes(user_id);
  CREATE INDEX IF NOT EXISTS idx_meal_schedules_user_date ON meal_schedules(user_id, meal_date);
  CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);
`);

try {
  db.exec('ALTER TABLE recipes ADD COLUMN favicon_url VARCHAR(1024)');
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

console.log('Database initialized at', dbPath);
db.close();
