import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseRecipeFromHtml, extractFaviconFromHtml } from '../services/recipeParser.js';
import { searchExternal, searchExternalByProvider } from '../services/externalSearch.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

const router = express.Router();

// Fetch HTML from URL (no auth required for import attempt; we'll require auth when saving)
async function fetchHtml(url) {
  const u = new URL(url);
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error('Invalid URL');
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'RecipePlatform/1.0 (Meal Planning; +https://recipe-platform.local)',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.text();
}

// POST /api/recipes/import — parse URL and return extracted recipe (optionally save if user is logged in)
router.post('/import', authMiddleware, async (req, res) => {
  const { url } = req.body;
  const userId = req.userId;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'URL must be http or https' });
  }

  try {
    const html = await fetchHtml(parsedUrl.href);
    const parsed = parseRecipeFromHtml(html, parsedUrl.href);
    const faviconUrl = extractFaviconFromHtml(html, parsedUrl.href) || null;

    if (!parsed || !parsed.title) {
      return res.status(422).json({
        error: 'Could not extract recipe from this URL. You can add it manually.',
        manual_fallback: true,
      });
    }

    // Upsert recipe (by source_url); link to user
    const ingredientsJson = JSON.stringify(parsed.ingredients || []);
    const existing = db.prepare('SELECT id, created_by_user_id FROM recipes WHERE source_url = ?').get(parsedUrl.href);

    let recipeId;
    if (existing) {
      recipeId = existing.id;
      db.prepare(
        'UPDATE recipes SET title = ?, description = ?, ingredients = ?, prep_time = ?, cook_time = ?, servings = ?, image_url = ?, favicon_url = ? WHERE id = ?'
      ).run(
        parsed.title,
        parsed.description || null,
        ingredientsJson,
        parsed.prep_time ?? null,
        parsed.cook_time ?? null,
        parsed.servings ?? null,
        parsed.image_url || null,
        faviconUrl,
        recipeId
      );
    } else {
      const insert = db.prepare(`
        INSERT INTO recipes (source_url, title, description, ingredients, prep_time, cook_time, servings, image_url, favicon_url, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insert.run(
        parsedUrl.href,
        parsed.title,
        parsed.description || null,
        ingredientsJson,
        parsed.prep_time ?? null,
        parsed.cook_time ?? null,
        parsed.servings ?? null,
        parsed.image_url || null,
        faviconUrl,
        userId
      );
      recipeId = result.lastInsertRowid;
    }

    // Ensure user-recipe link
    db.prepare(
      `INSERT OR IGNORE INTO user_recipes (user_id, recipe_id, is_favorite, personal_notes, saved_at) VALUES (?, ?, 0, NULL, datetime('now'))`
    ).run(userId, recipeId);

    const row = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
      FROM recipes r WHERE r.id = ?
    `).get(recipeId);

    res.status(existing ? 200 : 201).json({ recipe: rowToRecipe(row) });
  } catch (err) {
    console.error('Recipe import error:', err);
    if (err.message?.includes('fetch') || err.message?.includes('URL')) {
      return res.status(400).json({ error: 'Could not load this URL. Check that it is public and try again.' });
    }
    res.status(500).json({ error: 'Failed to import recipe' });
  }
});

// GET /api/recipes — list recipes (all for search, or user's collection if ?mine=1)
router.get('/', async (req, res) => {
  const mine = req.query.mine === '1' || req.query.mine === 'true';
  const userId = getUserIdFromHeader(req);

  if (mine) {
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const q = (req.query.q || '').trim();
    const favoritesOnly = req.query.favorites === '1' || req.query.favorites === 'true';
    const favCondition = favoritesOnly ? ' AND ur.is_favorite = 1' : '';
    let rows;
    if (q) {
      const pattern = `%${q.replace(/%/g, '\\%')}%`;
      rows = db.prepare(`
        SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
               ur.is_favorite, ur.personal_notes, ur.saved_at,
               (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
        FROM recipes r
        JOIN user_recipes ur ON ur.recipe_id = r.id AND ur.user_id = ?
        WHERE (r.title LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ?)${favCondition}
        ORDER BY ur.saved_at DESC
      `).all(userId, pattern, pattern, pattern);
    } else {
      rows = db.prepare(`
        SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
               ur.is_favorite, ur.personal_notes, ur.saved_at,
               (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
        FROM recipes r
        JOIN user_recipes ur ON ur.recipe_id = r.id AND ur.user_id = ?
        WHERE 1=1${favCondition}
        ORDER BY ur.saved_at DESC
      `).all(userId);
    }
    return res.json({ recipes: rows.map(rowToRecipe) });
  }

  // All recipes (for discovery/search)
  let q = (req.query.q ?? '').trim();
  if (q === 'undefined' || q === 'null') q = '';
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  let rows;
  if (q) {
    const pattern = `%${q.replace(/%/g, '\\%')}%`;
    rows = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count,
             (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id) AS saved_by_me
      FROM recipes r
      WHERE r.title LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ?
      ORDER BY save_count DESC, r.created_at DESC
      LIMIT ?
    `).all(userId ?? 0, pattern, pattern, pattern, limit);
  } else {
    rows = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count,
             (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id) AS saved_by_me
      FROM recipes r
      ORDER BY RANDOM()
      LIMIT ?
    `).all(userId ?? 0, limit);
  }

  // If search had a query and no internal results, return empty; frontend will request external per provider (so results show as soon as first provider returns)
  if (q && rows.length === 0) {
    return res.json({ recipes: [], external: [] });
  }

  res.json({ recipes: rows.map(rowToRecipe) });
});

// GET /api/recipes/external — single-provider external search (so frontend can show results as soon as first provider returns)
router.get('/external', async (req, res) => {
  const q = (req.query.q ?? '').trim();
  const provider = (req.query.provider ?? '').toLowerCase();
  if (!q || !['gutekueche', 'chefkoch', 'allrecipes', 'tasty'].includes(provider)) {
    return res.status(400).json({ error: 'Query and provider (gutekueche|chefkoch|allrecipes|tasty) required' });
  }
  try {
    const external = await searchExternalByProvider(q, provider, { limit: 30 });
    return res.json({ external });
  } catch (err) {
    console.error('External search (single provider):', err);
    return res.json({ external: [] });
  }
});

function getUserIdFromHeader(req) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId;
  } catch {
    return null;
  }
}

// GET /api/recipes/:id — single recipe
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid recipe ID' });

  const row = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
    FROM recipes r WHERE r.id = ?
  `).get(id);

  if (!row) return res.status(404).json({ error: 'Recipe not found' });

  const userId = getUserIdFromHeader(req);
  let userRecipe = null;
  if (userId) {
    userRecipe = db.prepare('SELECT is_favorite, personal_notes, saved_at FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, id);
  }

  res.json({
    recipe: rowToRecipe(row),
    user_recipe: userRecipe
      ? { is_favorite: !!userRecipe.is_favorite, personal_notes: userRecipe.personal_notes, saved_at: userRecipe.saved_at }
      : null,
  });
});

// POST /api/recipes — create recipe manually (auth required)
router.post('/', authMiddleware, (req, res) => {
  const userId = req.userId;
  const body = req.body;
  const title = body.title?.trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
  const ingredientsJson = JSON.stringify(ingredients);

  const sourceUrl = body.source_url?.trim() || `https://recipe-platform.local/manual/${Date.now()}`;
  const existing = db.prepare('SELECT id FROM recipes WHERE source_url = ?').get(sourceUrl);
  if (existing) {
    db.prepare(
      `INSERT OR IGNORE INTO user_recipes (user_id, recipe_id, is_favorite, personal_notes, saved_at) VALUES (?, ?, 0, NULL, datetime('now'))`
    ).run(userId, existing.id);
    const row = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count FROM recipes r WHERE r.id = ?
    `).get(existing.id);
    return res.status(200).json({ recipe: rowToRecipe(row) });
  }

  const insert = db.prepare(`
    INSERT INTO recipes (source_url, title, description, ingredients, prep_time, cook_time, servings, image_url, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = insert.run(
    sourceUrl,
    title,
    body.description?.trim() || null,
    ingredientsJson,
    body.prep_time ?? null,
    body.cook_time ?? null,
    body.servings ?? null,
    body.image_url?.trim() || null,
    userId
  );
  const recipeId = result.lastInsertRowid;
  db.prepare(
    `INSERT INTO user_recipes (user_id, recipe_id, is_favorite, personal_notes, saved_at) VALUES (?, ?, 0, NULL, datetime('now'))`
  ).run(userId, recipeId);

  const row = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count FROM recipes r WHERE r.id = ?
  `).get(recipeId);
  res.status(201).json({ recipe: rowToRecipe(row) });
});

// POST /api/recipes/:id/save — add recipe to user's collection
router.post('/:id/save', authMiddleware, (req, res) => {
  const userId = req.userId;
  const recipeId = parseInt(req.params.id, 10);
  if (Number.isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

  const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipeId);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  db.prepare(
    `INSERT OR IGNORE INTO user_recipes (user_id, recipe_id, is_favorite, personal_notes, saved_at) VALUES (?, ?, 0, NULL, datetime('now'))`
  ).run(userId, recipeId);

  const row = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count FROM recipes r WHERE r.id = ?
  `).get(recipeId);
  res.json({ recipe: rowToRecipe(row) });
});

// DELETE /api/recipes/:id/save — remove from user's collection (not delete recipe)
router.delete('/:id/save', authMiddleware, (req, res) => {
  const userId = req.userId;
  const recipeId = parseInt(req.params.id, 10);
  if (Number.isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

  db.prepare('DELETE FROM user_recipes WHERE user_id = ? AND recipe_id = ?').run(userId, recipeId);
  res.status(204).send();
});

// PATCH /api/recipes/:id/user-recipe — update favorite / personal notes
router.patch('/:id/user-recipe', authMiddleware, (req, res) => {
  const userId = req.userId;
  const recipeId = parseInt(req.params.id, 10);
  if (Number.isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

  const { is_favorite: isFavorite, personal_notes: personalNotes } = req.body;
  db.prepare(
    `UPDATE user_recipes SET is_favorite = COALESCE(?, is_favorite), personal_notes = COALESCE(?, personal_notes) WHERE user_id = ? AND recipe_id = ?`
  ).run(isFavorite !== undefined ? (isFavorite ? 1 : 0) : undefined, personalNotes !== undefined ? personalNotes : undefined, userId, recipeId);

  const row = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count FROM recipes r WHERE r.id = ?
  `).get(recipeId);
  res.json({ recipe: rowToRecipe(row) });
});

function sourceDomainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
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
    created_at: row.created_at,
    save_count: row.save_count ?? 0,
    saved_by_me: !!(row.saved_by_me != null && row.saved_by_me !== 0),
    is_favorite: row.is_favorite ? true : false,
    personal_notes: row.personal_notes,
    saved_at: row.saved_at,
  };
}

export default router;
