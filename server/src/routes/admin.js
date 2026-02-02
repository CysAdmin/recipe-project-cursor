import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

router.use(authMiddleware);
router.use(adminMiddleware);

// ——— Users ———
// GET /api/admin/users — list all users
router.get('/users', (req, res) => {
  const rows = db.prepare(`
    SELECT id, email, display_name, is_admin, created_at, email_verified_at
    FROM users
    ORDER BY id
  `).all();
  res.json({
    users: rows.map((r) => ({
      id: r.id,
      email: r.email,
      display_name: r.display_name,
      is_admin: !!r.is_admin,
      created_at: r.created_at,
      email_verified: !!r.email_verified_at,
    })),
  });
});

// GET /api/admin/users/:id — get one user with counts
router.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
  const row = db.prepare(
    'SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = ?'
  ).get(id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  const savedCount = db.prepare('SELECT COUNT(*) AS c FROM user_recipes WHERE user_id = ?').get(id);
  const scheduleCount = db.prepare('SELECT COUNT(*) AS c FROM meal_schedules WHERE user_id = ?').get(id);
  res.json({
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: !!row.is_admin,
      created_at: row.created_at,
      saved_recipes_count: savedCount?.c ?? 0,
      meal_schedules_count: scheduleCount?.c ?? 0,
    },
  });
});

// PATCH /api/admin/users/:id — update user (email, display_name, is_admin; optional password)
router.patch('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
  const row = db.prepare('SELECT id, email, display_name, is_admin FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'User not found' });

  const { email, display_name: displayName, is_admin: isAdmin, new_password: newPassword, email_verified: emailVerified } = req.body;

  let emailNorm = row.email;
  if (email != null && String(email).trim()) {
    emailNorm = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(emailNorm, id);
    if (existing) return res.status(409).json({ error: 'Email already in use' });
  }

  const displayNameVal = displayName !== undefined ? (displayName?.trim() || null) : row.display_name;
  if (displayNameVal) {
    const existing = db.prepare(
      'SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) AND id != ?'
    ).get(displayNameVal, id);
    if (existing) return res.status(409).json({ error: 'Display name already in use' });
  }

  const isAdminVal = isAdmin !== undefined ? (isAdmin ? 1 : 0) : (row.is_admin ? 1 : 0);

  const updates = [];
  const params = [];
  if (email != null) {
    updates.push('email = ?');
    params.push(emailNorm);
  }
  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(displayNameVal);
  }
  if (isAdmin !== undefined) {
    updates.push('is_admin = ?');
    params.push(isAdminVal);
  }
  if (newPassword != null && String(newPassword).trim()) {
    if (newPassword.length < PASSWORD_MIN_LENGTH)
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    if (!PASSWORD_REGEX.test(newPassword))
      return res.status(400).json({ error: 'New password must contain both letters and numbers' });
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(newPassword, 10));
  }
  if (typeof emailVerified === 'boolean' && emailVerified) {
    updates.push('email_verified_at = datetime(\'now\')');
    updates.push('verification_token = NULL');
    updates.push('verification_token_expires_at = NULL');
  }
  if (updates.length) {
    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare(
    'SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = ?'
  ).get(id);
  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name,
      is_admin: !!updated.is_admin,
      created_at: updated.created_at,
    },
  });
});

// POST /api/admin/users — create user
router.post('/users', (req, res) => {
  const { email, password, display_name: displayName, is_admin: isAdmin } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < PASSWORD_MIN_LENGTH)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!PASSWORD_REGEX.test(password))
    return res.status(400).json({ error: 'Password must contain both letters and numbers' });

  const emailNorm = String(email).trim().toLowerCase();
  const passwordHash = bcrypt.hashSync(password, 10);
  const adminVal = isAdmin ? 1 : 0;

  try {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, display_name, is_admin)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(emailNorm, passwordHash, displayName?.trim() || null, adminVal);
    const userId = result.lastInsertRowid;
    const row = db.prepare(
      'SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = ?'
    ).get(userId);
    res.status(201).json({
      user: {
        id: row.id,
        email: row.email,
        display_name: row.display_name,
        is_admin: !!row.is_admin,
        created_at: row.created_at,
      },
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE')
      return res.status(409).json({ error: 'Email already registered' });
    throw err;
  }
});

// DELETE /api/admin/users/:id — delete user (cascade)
router.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'User not found' });

  // Manually cascade delete dependent records (SQLite foreign_keys off by default)
  db.prepare('DELETE FROM meal_schedules WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM user_recipes WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM collection_recipes WHERE collection_id IN (SELECT id FROM collections WHERE user_id = ?)').run(id);
  db.prepare('DELETE FROM collections WHERE user_id = ?').run(id);

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.status(204).send();
});

// ——— Recipes ———
function sourceDomainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

const RECIPE_TAG_KEYS = ['quick', 'easy', 'after_work', 'vegetarian', 'comfort_food', 'summer', 'reheatable'];

function parseTags(tagsJson) {
  if (!tagsJson) return [];
  try {
    const arr = JSON.parse(tagsJson);
    return Array.isArray(arr) ? arr.filter((k) => RECIPE_TAG_KEYS.includes(k)) : [];
  } catch {
    return [];
  }
}

function rowToRecipe(row) {
  let ingredients = [];
  try {
    ingredients = JSON.parse(row.ingredients || '[]');
  } catch {
    ingredients = [];
  }
  return {
    id: row.id,
    source_url: row.source_url,
    source_domain: sourceDomainFromUrl(row.source_url),
    title: row.title,
    description: row.description,
    ingredients,
    prep_time: row.prep_time,
    cook_time: row.cook_time,
    servings: row.servings,
    image_url: row.image_url,
    favicon_url: row.favicon_url || null,
    tags: parseTags(row.tags),
    created_at: row.created_at,
    save_count: row.save_count ?? 0,
  };
}

// GET /api/admin/recipes — list all recipes
router.get('/recipes', (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  let rows;
  if (q) {
    const pattern = `%${q.replace(/%/g, '\\%')}%`;
    rows = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.tags, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
      FROM recipes r
      WHERE r.title LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ?
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(pattern, pattern, pattern, limit);
  } else {
    rows = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.tags, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
      FROM recipes r
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(limit);
  }
  res.json({ recipes: rows.map(rowToRecipe) });
});

// GET /api/admin/recipes/:id — get one recipe (admin view)
router.get('/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recipe ID' });
  const row = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.tags, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
    FROM recipes r WHERE r.id = ?
  `).get(id);
  if (!row) return res.status(404).json({ error: 'Recipe not found' });
  res.json({ recipe: rowToRecipe(row) });
});

// PATCH /api/admin/recipes/:id — update recipe
router.patch('/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recipe ID' });
  const existing = db.prepare('SELECT id FROM recipes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Recipe not found' });

  const body = req.body;
  const allowed = [
    'title', 'description', 'ingredients',
    'prep_time', 'cook_time', 'servings', 'image_url', 'favicon_url', 'source_url',
  ];
  const updates = [];
  const params = [];
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    if (key === 'ingredients') {
      const val = Array.isArray(body.ingredients) ? JSON.stringify(body.ingredients) : body.ingredients;
      updates.push('ingredients = ?');
      params.push(val ?? '[]');
    } else if (key === 'prep_time' || key === 'cook_time' || key === 'servings') {
      const val = body[key];
      updates.push(`${key} = ?`);
      params.push(val == null ? null : parseInt(val, 10));
    } else {
      updates.push(`${key} = ?`);
      params.push(body[key]?.trim?.() ?? body[key] ?? null);
    }
  }
  if (body.tags !== undefined) {
    const tagsArr = Array.isArray(body.tags) ? body.tags.filter((k) => RECIPE_TAG_KEYS.includes(k)) : [];
    updates.push('tags = ?');
    params.push(JSON.stringify(tagsArr));
  }
  if (updates.length) {
    params.push(id);
    db.prepare(`UPDATE recipes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const row = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.tags, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
    FROM recipes r WHERE r.id = ?
  `).get(id);
  res.json({ recipe: rowToRecipe(row) });
});

// DELETE /api/admin/recipes/:id — delete recipe (cascade user_recipes)
router.delete('/recipes/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recipe ID' });
  const row = db.prepare('SELECT id FROM recipes WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Recipe not found' });
  db.prepare('DELETE FROM user_recipes WHERE recipe_id = ?').run(id);
  db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  res.status(204).send();
});

export default router;
