import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { parseRecipeFromHtml, extractFaviconFromHtml } from '../services/recipeParser.js';
import { searchExternal, searchExternalByProvider } from '../services/externalSearch.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Tag keys stored on recipes (favorite is derived from user_recipe.is_favorite, not stored here)
const RECIPE_TAG_KEYS = ['quick', 'easy', 'after_work', 'vegetarian', 'comfort_food', 'summer', 'reheatable'];

const router = express.Router();

const FETCH_TIMEOUT_MS = 15000;

const SEARCH_USER_AGENT =
  process.env.SEARCH_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Fetch HTML from URL with timeout and browser-like headers to reduce blocking
async function fetchHtml(url) {
  const u = new URL(url);
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new Error('Invalid URL');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': SEARCH_USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timeoutId);
  }
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
    let html;
    try {
      html = await fetchHtml(parsedUrl.href);
    } catch (fetchErr) {
      const code = fetchErr.code || fetchErr.cause?.code;
      const isNetwork =
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNREFUSED' ||
        code === 'ENOTFOUND' ||
        code === 'ERR_NETWORK' ||
        fetchErr.name === 'AbortError';
      if (isNetwork) {
        return res.status(502).json({
          error:
            'Die Website konnte nicht geladen werden. Sie blockiert möglicherweise automatische Zugriffe oder ist nicht erreichbar. Bitte URL prüfen oder Rezept manuell anlegen.',
          manual_fallback: true,
        });
      }
      throw fetchErr;
    }

    const parsed = parseRecipeFromHtml(html, parsedUrl.href);
    const faviconUrl = extractFaviconFromHtml(html, parsedUrl.href) || null;

    const hasTitle = parsed?.title?.trim();
    const hasIngredients = Array.isArray(parsed?.ingredients) && parsed.ingredients.length > 0;
    if (!hasTitle || !hasIngredients) {
      return res.status(422).json({
        error: 'No recipe could be recognized from this URL.',
        code: 'NO_RECIPE_FOUND',
        manual_fallback: true,
      });
    }

    const title = parsed.title;
    const description = parsed.description || null;
    const ingredientsJson = JSON.stringify(parsed.ingredients || []);
    const prep_time = parsed.prep_time ?? null;
    const cook_time = parsed.cook_time ?? null;
    const servings = parsed.servings ?? null;
    const image_url = parsed.image_url || null;

    // Upsert recipe (by source_url); link to user
    const existing = db.prepare('SELECT id, created_by_user_id FROM recipes WHERE source_url = ?').get(parsedUrl.href);

    let recipeId;
    if (existing) {
      recipeId = existing.id;
      db.prepare(
        'UPDATE recipes SET title = ?, description = ?, ingredients = ?, prep_time = ?, cook_time = ?, servings = ?, image_url = ?, favicon_url = ? WHERE id = ?'
      ).run(title, description, ingredientsJson, prep_time, cook_time, servings, image_url, faviconUrl, recipeId);
    } else {
      const insert = db.prepare(`
        INSERT INTO recipes (source_url, title, description, ingredients, prep_time, cook_time, servings, image_url, favicon_url, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insert.run(
        parsedUrl.href,
        title,
        description,
        ingredientsJson,
        prep_time,
        cook_time,
        servings,
        image_url,
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
    const userRecipeTags = db.prepare('SELECT tags FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, recipeId);
    res.status(existing ? 200 : 201).json({ recipe: rowToRecipe(row, userRecipeTags?.tags ?? '[]') });
  } catch (err) {
    console.error('Recipe import error:', err);
    if (err.message?.includes('fetch') || err.message?.includes('URL')) {
      return res.status(400).json({
        error: 'Die URL konnte nicht geladen werden. Bitte prüfen oder Rezept manuell anlegen.',
        manual_fallback: true,
      });
    }
    res.status(500).json({ error: 'Import fehlgeschlagen. Bitte später erneut versuchen.' });
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
    const tagFilter = (req.query.tag || '').trim();
    const maxMinutes = parseInt(req.query.max_minutes, 10);
    const quickByTime = !Number.isNaN(maxMinutes) && maxMinutes > 0;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const favCondition = favoritesOnly ? ' AND ur.is_favorite = 1' : '';
    const tagCondition = tagFilter === 'favorite'
      ? ' AND ur.is_favorite = 1'
      : tagFilter && RECIPE_TAG_KEYS.includes(tagFilter)
        ? ` AND EXISTS (SELECT 1 FROM json_each(COALESCE(ur.tags,'[]')) WHERE json_each.value = ?)`
        : '';
    const tagParam = tagFilter && tagFilter !== 'favorite' && RECIPE_TAG_KEYS.includes(tagFilter) ? [tagFilter] : [];
    const timeCondition = quickByTime ? ' AND (COALESCE(r.prep_time, 0) + COALESCE(r.cook_time, 0)) <= ?' : '';
    const timeParam = quickByTime ? [maxMinutes] : [];
    const whereClause = q
      ? `(r.title LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ?)${favCondition}${tagCondition}${timeCondition}`
      : `1=1${favCondition}${tagCondition}${timeCondition}`;
    const countParams = q ? [userId, `%${q.replace(/%/g, '\\%')}%`, `%${q.replace(/%/g, '\\%')}%`, `%${q.replace(/%/g, '\\%')}%`, ...tagParam, ...timeParam] : [userId, ...tagParam, ...timeParam];
    const totalCount = db.prepare(`
      SELECT COUNT(*) AS n FROM recipes r
      JOIN user_recipes ur ON ur.recipe_id = r.id AND ur.user_id = ?
      WHERE ${whereClause}
    `).get(...countParams)?.n ?? 0;
    let rows;
    if (q) {
      const pattern = `%${q.replace(/%/g, '\\%')}%`;
      rows = db.prepare(`
        SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
               ur.is_favorite, ur.personal_notes, ur.saved_at, COALESCE(ur.tags,'[]') AS user_tags,
               (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
        FROM recipes r
        JOIN user_recipes ur ON ur.recipe_id = r.id AND ur.user_id = ?
        WHERE (r.title LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ?)${favCondition}${tagCondition}${timeCondition}
        ORDER BY ur.saved_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, pattern, pattern, pattern, ...tagParam, ...timeParam, limit, offset);
    } else {
      rows = db.prepare(`
        SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
               ur.is_favorite, ur.personal_notes, ur.saved_at, COALESCE(ur.tags,'[]') AS user_tags,
               (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
        FROM recipes r
        JOIN user_recipes ur ON ur.recipe_id = r.id AND ur.user_id = ?
        WHERE 1=1${favCondition}${tagCondition}${timeCondition}
        ORDER BY ur.saved_at DESC
        LIMIT ? OFFSET ?
      `).all(userId, ...tagParam, ...timeParam, limit, offset);
    }
    return res.json({
      recipes: rows.map((row) => rowToRecipe(row, row.user_tags != null ? row.user_tags : '[]')),
      total: totalCount,
    });
  }

  // All recipes (for discovery/search)
  let q = (req.query.q ?? '').trim();
  if (q === 'undefined' || q === 'null') q = '';
  const tagFilter = (req.query.tag ?? '').trim();
  const excludeMine = req.query.exclude_mine === '1' || req.query.exclude_mine === 'true';
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  let tagCondition = '';
  let tagParam = [];
  if (tagFilter === 'favorite' && userId) {
    tagCondition = ' AND EXISTS (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id AND is_favorite = 1)';
    tagParam = [userId];
  } else if (tagFilter && RECIPE_TAG_KEYS.includes(tagFilter)) {
    // User-specific tags: when logged in filter by user_recipes.tags; when not, filter by recipe-level r.tags (legacy)
    if (userId) {
      tagCondition = ' AND EXISTS (SELECT 1 FROM user_recipes ur WHERE ur.user_id = ? AND ur.recipe_id = r.id AND EXISTS (SELECT 1 FROM json_each(COALESCE(ur.tags,\'[]\')) WHERE json_each.value = ?))';
      tagParam = [userId, tagFilter];
    } else {
      tagCondition = ` AND EXISTS (SELECT 1 FROM json_each(COALESCE(r.tags,'[]')) WHERE json_each.value = ?)`;
      tagParam = [tagFilter];
    }
  }
  const excludeCondition = excludeMine && userId ? ' AND NOT EXISTS (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id)' : '';
  const excludeParam = excludeMine && userId ? [userId] : [];
  const uid = userId ?? 0;
  let rows;
  if (q) {
    const pattern = `%${q.replace(/%/g, '\\%')}%`;
    rows = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count,
             (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id) AS saved_by_me,
             (SELECT ur.tags FROM user_recipes ur WHERE ur.user_id = ? AND ur.recipe_id = r.id) AS user_tags
      FROM recipes r
      WHERE (r.title LIKE ? OR r.description LIKE ? OR r.ingredients LIKE ?)${tagCondition}${excludeCondition}
      ORDER BY save_count DESC, r.created_at DESC
      LIMIT ?
    `).all(uid, uid, pattern, pattern, pattern, ...tagParam, ...excludeParam, limit);
  } else {
    rows = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count,
             (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id) AS saved_by_me,
             (SELECT ur.tags FROM user_recipes ur WHERE ur.user_id = ? AND ur.recipe_id = r.id) AS user_tags
      FROM recipes r
      WHERE 1=1${tagCondition}${excludeCondition}
      ORDER BY RANDOM()
      LIMIT ?
    `).all(uid, uid, ...tagParam, ...excludeParam, limit);
  }

  // If search had a query and no internal results, return empty; frontend will request external per provider (so results show as soon as first provider returns)
  if (q && rows.length === 0) {
    return res.json({ recipes: [], external: [] });
  }

  // Only show tags to the user who set them (saved_by_me + user_tags)
  res.json({ recipes: rows.map((row) => rowToRecipe(row, row.saved_by_me && row.user_tags != null ? row.user_tags : '[]')) });
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

// Helpers for similar-to-favorites: tokenize text and extract ingredients as single string
function getTokens(text) {
  if (!text || typeof text !== 'string') return [];
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  const tokens = normalized.split(/[^a-z0-9äöüß]+/).filter((t) => t.length >= 2);
  return [...new Set(tokens)];
}
function getIngredientsText(ingredients) {
  if (!Array.isArray(ingredients)) return '';
  return ingredients
    .map((ing) => {
      if (typeof ing === 'string') return ing;
      if (ing && typeof ing === 'object') return ing.raw || ing.ingredient_key || '';
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

// GET /api/recipes/similar-to-favorites — recipes similar to user's favorites (by title + ingredients), unsaved only, max 5
router.get('/similar-to-favorites', authMiddleware, (req, res) => {
  const userId = req.userId;
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);

  const favorites = db.prepare(`
    SELECT r.id, r.title, r.ingredients
    FROM recipes r
    JOIN user_recipes ur ON ur.recipe_id = r.id AND ur.user_id = ? AND ur.is_favorite = 1
  `).all(userId);

  if (favorites.length === 0) {
    return res.json({ recipes: [] });
  }

  const favoriteTokenSet = new Set();
  for (const row of favorites) {
    getTokens(row.title || '').forEach((t) => favoriteTokenSet.add(t));
    let ingredients = [];
    try {
      ingredients = JSON.parse(row.ingredients || '[]');
    } catch {
      ingredients = [];
    }
    getTokens(getIngredientsText(ingredients)).forEach((t) => favoriteTokenSet.add(t));
  }

  const candidates = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.tags, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count,
           (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id) AS saved_by_me
    FROM recipes r
    WHERE NOT EXISTS (SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = r.id)
    LIMIT 200
  `).all(userId, userId);

  const scored = candidates.map((row) => {
    const titleTokens = getTokens(row.title || '');
    let ingredients = [];
    try {
      ingredients = JSON.parse(row.ingredients || '[]');
    } catch {
      ingredients = [];
    }
    const ingTokens = getTokens(getIngredientsText(ingredients));
    const candidateSet = new Set([...titleTokens, ...ingTokens]);
    let score = 0;
    for (const t of favoriteTokenSet) {
      if (candidateSet.has(t)) score += 1;
    }
    return { row, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map(({ row }) => row);
  // Similar recipes are never "mine", so never show tags
  res.json({ recipes: top.map((row) => rowToRecipe(row, '[]')) });
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
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.tags, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count
    FROM recipes r WHERE r.id = ?
  `).get(id);

  if (!row) return res.status(404).json({ error: 'Recipe not found' });

  const userId = getUserIdFromHeader(req);
  let userRecipe = null;
  if (userId) {
    userRecipe = db.prepare('SELECT is_favorite, personal_notes, saved_at, tags FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, id);
  }

  // Tags only for the user who set them (from user_recipes)
  const recipePayload = rowToRecipe(row, userRecipe && userRecipe.tags != null ? userRecipe.tags : '[]');
  res.json({
    recipe: recipePayload,
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

  const sourceUrl = body.source_url?.trim() || `https://simplykeepit.local/manual/${Date.now()}`;
  const existing = db.prepare('SELECT id FROM recipes WHERE source_url = ?').get(sourceUrl);
  if (existing) {
    db.prepare(
      `INSERT OR IGNORE INTO user_recipes (user_id, recipe_id, is_favorite, personal_notes, saved_at) VALUES (?, ?, 0, NULL, datetime('now'))`
    ).run(userId, existing.id);
    const row = db.prepare(`
      SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
             (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count FROM recipes r WHERE r.id = ?
    `).get(existing.id);
    const urTags = db.prepare('SELECT tags FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, existing.id);
    return res.status(200).json({ recipe: rowToRecipe(row, urTags?.tags ?? '[]') });
  }

  const insert = db.prepare(`
    INSERT INTO recipes (source_url, title, description, ingredients, prep_time, cook_time, servings, image_url, tags, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?)
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
  const urTags = db.prepare('SELECT tags FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, recipeId);
  res.status(201).json({ recipe: rowToRecipe(row, urTags?.tags ?? '[]') });
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
  const urTags = db.prepare('SELECT tags FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, recipeId);
  res.json({ recipe: rowToRecipe(row, urTags?.tags ?? '[]') });
});

// DELETE /api/recipes/:id/save — remove from user's collection (not delete recipe)
router.delete('/:id/save', authMiddleware, (req, res) => {
  const userId = req.userId;
  const recipeId = parseInt(req.params.id, 10);
  if (Number.isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

  db.prepare('DELETE FROM user_recipes WHERE user_id = ? AND recipe_id = ?').run(userId, recipeId);
  res.status(204).send();
});

// PATCH /api/recipes/:id — update tags (only for user who has saved the recipe; tags stored in user_recipes)
router.patch('/:id', authMiddleware, (req, res) => {
  const userId = req.userId;
  const recipeId = parseInt(req.params.id, 10);
  if (Number.isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });

  const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipeId);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  const hasSaved = db.prepare('SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, recipeId);
  if (!hasSaved) return res.status(403).json({ error: 'Not allowed to edit this recipe' });

  const { tags } = req.body;
  if (tags !== undefined) {
    const tagsArr = Array.isArray(tags) ? tags.filter((k) => RECIPE_TAG_KEYS.includes(k)) : [];
    db.prepare('UPDATE user_recipes SET tags = ? WHERE user_id = ? AND recipe_id = ?').run(JSON.stringify(tagsArr), userId, recipeId);
  }

  const row = db.prepare(`
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings, r.image_url, r.favicon_url, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count FROM recipes r WHERE r.id = ?
  `).get(recipeId);
  const userRecipe = db.prepare('SELECT is_favorite, personal_notes, saved_at, tags FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, recipeId);
  const recipePayload = rowToRecipe(row, userRecipe && userRecipe.tags != null ? userRecipe.tags : '[]');
  res.json({
    recipe: recipePayload,
    user_recipe: userRecipe
      ? { is_favorite: !!userRecipe.is_favorite, personal_notes: userRecipe.personal_notes, saved_at: userRecipe.saved_at }
      : null,
  });
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
  const urTags = db.prepare('SELECT tags FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, recipeId);
  res.json({ recipe: rowToRecipe(row, urTags?.tags ?? '[]') });
});

function sourceDomainFromUrl(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function parseTags(tagsJson) {
  if (!tagsJson) return [];
  try {
    const arr = JSON.parse(tagsJson);
    return Array.isArray(arr) ? arr.filter((k) => RECIPE_TAG_KEYS.includes(k)) : [];
  } catch {
    return [];
  }
}

function rowToRecipe(row, tagsJsonOverride) {
  let ingredients = [];
  try {
    ingredients = JSON.parse(row.ingredients || '[]');
  } catch {
    ingredients = [];
  }
  const tags = tagsJsonOverride !== undefined ? parseTags(tagsJsonOverride) : parseTags(row.tags);
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
    tags,
    created_at: row.created_at,
    save_count: row.save_count ?? 0,
    saved_by_me: !!(row.saved_by_me != null && row.saved_by_me !== 0),
    is_favorite: row.is_favorite ? true : false,
    personal_notes: row.personal_notes,
    saved_at: row.saved_at,
  };
}

export default router;
