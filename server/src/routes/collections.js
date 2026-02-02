import express from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const RECIPE_TAG_KEYS = ['quick', 'easy', 'after_work', 'vegetarian', 'comfort_food', 'summer', 'reheatable'];
const router = express.Router();

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
  const out = {
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
  if (row.average_rating != null) out.average_rating = row.average_rating;
  if (row.rating_count != null) out.rating_count = row.rating_count ?? 0;
  return out;
}

// GET /api/collections — list my collections (with up to 4 cover images from recipes)
router.get('/', authMiddleware, (req, res) => {
  const userId = req.userId;
  const rows = db
    .prepare(
      `
    SELECT c.id, c.name, c.created_at,
           (SELECT COUNT(*) FROM collection_recipes WHERE collection_id = c.id) AS recipe_count,
           (SELECT json_group_array(img) FROM (
             SELECT r.image_url AS img FROM recipes r
             INNER JOIN collection_recipes cr ON cr.recipe_id = r.id AND cr.collection_id = c.id
             ORDER BY cr.added_at DESC LIMIT 4
           )) AS cover_images_json
    FROM collections c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `
    )
    .all(userId);
  const collections = rows.map((row) => {
    const out = { id: row.id, name: row.name, created_at: row.created_at, recipe_count: row.recipe_count ?? 0 };
    try {
      const arr = row.cover_images_json ? JSON.parse(row.cover_images_json) : [];
      out.cover_images = Array.isArray(arr) ? arr.filter((url) => url != null && url !== '') : [];
    } catch {
      out.cover_images = [];
    }
    return out;
  });
  res.json({ collections });
});

// POST /api/collections — create collection
router.post('/', authMiddleware, (req, res) => {
  const userId = req.userId;
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare('INSERT INTO collections (user_id, name) VALUES (?, ?)').run(userId, name);
  const row = db.prepare('SELECT id, name, created_at FROM collections WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ collection: row });
});

// GET /api/collections/:id — one collection with recipes (owner only)
router.get('/:id', authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid collection ID' });
  const collection = db.prepare('SELECT id, user_id, name, created_at FROM collections WHERE id = ?').get(id);
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  if (collection.user_id !== userId) return res.status(403).json({ error: 'Not allowed to view this collection' });
  const recipeRows = db
    .prepare(
      `
    SELECT r.id, r.source_url, r.title, r.description, r.ingredients, r.prep_time, r.cook_time, r.servings,
           r.image_url, r.favicon_url, r.tags, r.created_at,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id) AS save_count,
           (SELECT ROUND(AVG(rating), 1) FROM user_recipes WHERE recipe_id = r.id AND rating IS NOT NULL) AS average_rating,
           (SELECT COUNT(*) FROM user_recipes WHERE recipe_id = r.id AND rating IS NOT NULL) AS rating_count
    FROM recipes r
    JOIN collection_recipes cr ON cr.recipe_id = r.id AND cr.collection_id = ?
    ORDER BY cr.added_at DESC
  `
    )
    .all(id);
  const recipes = recipeRows.map((row) => rowToRecipe(row, row.tags ?? '[]'));
  res.json({ collection: { id: collection.id, name: collection.name, created_at: collection.created_at }, recipes });
});

// PATCH /api/collections/:id — rename (owner only)
router.patch('/:id', authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid collection ID' });
  const collection = db.prepare('SELECT id, user_id FROM collections WHERE id = ?').get(id);
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  if (collection.user_id !== userId) return res.status(403).json({ error: 'Not allowed to edit this collection' });
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.prepare('UPDATE collections SET name = ? WHERE id = ?').run(name, id);
  const row = db.prepare('SELECT id, name, created_at FROM collections WHERE id = ?').get(id);
  res.json({ collection: row });
});

// DELETE /api/collections/:id — delete (owner only)
router.delete('/:id', authMiddleware, (req, res) => {
  const userId = req.userId;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid collection ID' });
  const collection = db.prepare('SELECT id, user_id FROM collections WHERE id = ?').get(id);
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  if (collection.user_id !== userId) return res.status(403).json({ error: 'Not allowed to delete this collection' });
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  res.status(204).send();
});

// POST /api/collections/:id/recipes — add recipe (recipe must be in user_recipes)
router.post('/:id/recipes', authMiddleware, (req, res) => {
  const userId = req.userId;
  const collectionId = parseInt(req.params.id, 10);
  const recipeId = parseInt(req.body?.recipe_id, 10);
  if (Number.isNaN(collectionId)) return res.status(400).json({ error: 'Invalid collection ID' });
  if (Number.isNaN(recipeId)) return res.status(400).json({ error: 'recipe_id is required and must be a number' });
  const collection = db.prepare('SELECT id, user_id FROM collections WHERE id = ?').get(collectionId);
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  if (collection.user_id !== userId) return res.status(403).json({ error: 'Not allowed to edit this collection' });
  const hasRecipe = db.prepare('SELECT 1 FROM user_recipes WHERE user_id = ? AND recipe_id = ?').get(userId, recipeId);
  if (!hasRecipe) return res.status(400).json({ error: 'Recipe must be in My Recipes before adding to a collection' });
  const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipeId);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
  try {
    db.prepare('INSERT INTO collection_recipes (collection_id, recipe_id) VALUES (?, ?)').run(collectionId, recipeId);
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(200).json({ added: true });
    throw e;
  }
  res.status(201).json({ added: true });
});

// DELETE /api/collections/:id/recipes/:recipeId — remove recipe from collection
router.delete('/:id/recipes/:recipeId', authMiddleware, (req, res) => {
  const userId = req.userId;
  const collectionId = parseInt(req.params.id, 10);
  const recipeId = parseInt(req.params.recipeId, 10);
  if (Number.isNaN(collectionId)) return res.status(400).json({ error: 'Invalid collection ID' });
  if (Number.isNaN(recipeId)) return res.status(400).json({ error: 'Invalid recipe ID' });
  const collection = db.prepare('SELECT id, user_id FROM collections WHERE id = ?').get(collectionId);
  if (!collection) return res.status(404).json({ error: 'Collection not found' });
  if (collection.user_id !== userId) return res.status(403).json({ error: 'Not allowed to edit this collection' });
  db.prepare('DELETE FROM collection_recipes WHERE collection_id = ? AND recipe_id = ?').run(collectionId, recipeId);
  res.status(204).send();
});

export default router;
