import express from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

function dateStr(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

// Parse "100g tofu" -> { quantity: 100, unit: 'g', name: 'tofu' }; "salt" -> { quantity: null, unit: '', name: 'salt' }
const UNIT_ALIASES = {
  g: 'g', gramm: 'g', gramme: 'g', gram: 'g', gramms: 'g', grams: 'g',
  kg: 'kg', kilogramm: 'kg', kilo: 'kg',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml',
  l: 'l', liter: 'l', litre: 'l',
  cup: 'cup', cups: 'cup', tasse: 'cup', tassen: 'cup',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', el: 'tbsp', esslöffel: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', tl: 'tsp', teelöffel: 'tsp',
  oz: 'oz', unze: 'oz', unzen: 'oz',
  lb: 'lb', pound: 'lb', pounds: 'lb', pfund: 'lb',
  stk: 'stk', stück: 'stk', piece: 'stk', pieces: 'stk',
};

function parseIngredient(line) {
  const raw = String(line).trim();
  if (!raw) return null;
  // Match optional quantity: number, decimal, or fraction (e.g. 1/2, 1 1/2)
  const qtyMatch = raw.match(/^\s*(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?(?:\s+(\d+)\s*\/\s*(\d+))?\s*/);
  let quantity = null;
  let rest = raw;
  if (qtyMatch) {
    const main = parseFloat(qtyMatch[1].replace(',', '.'));
    if (qtyMatch[4]) {
      quantity = main + parseFloat(qtyMatch[3]) / parseFloat(qtyMatch[4]);
    } else if (qtyMatch[2]) {
      quantity = main / parseFloat(qtyMatch[2]);
    } else {
      quantity = main;
    }
    rest = raw.slice(qtyMatch[0].length).trim();
  }
  // Rest: optional unit (with or without space after number) then ingredient name
  // e.g. "g tofu", "cup flour", "ml milk"
  const unitMatch = rest.match(/^\s*([a-zA-Zäöüß]+)\s+(.+)$/);
  let unit = '';
  let name = rest;
  if (unitMatch) {
    const possibleUnit = unitMatch[1].toLowerCase();
    const canonical = UNIT_ALIASES[possibleUnit] || UNIT_ALIASES[possibleUnit.replace(/e$/, '')];
    if (canonical) {
      unit = canonical;
      name = unitMatch[2].trim();
    }
  }
  name = name.trim().toLowerCase();
  if (!name) return null;
  return { quantity, unit, name, raw };
}

function formatMergedIngredient(quantity, unit, name) {
  if (quantity == null || quantity === 0) return name;
  const q = Number(quantity);
  const qStr = q % 1 === 0 ? String(Math.round(q)) : q.toFixed(2).replace(/\.?0+$/, '');
  if (unit) return `${qStr} ${unit} ${name}`;
  return `${qStr} ${name}`;
}

const multiplier = (servings, recipeServings) => {
  if (!recipeServings || recipeServings <= 0) return 1;
  return (servings || 1) / recipeServings;
};

// Aggregate from ingredient entries (string or object), multiply by mult, merge into map
function mergeInto(merged, ingredients, mult) {
  for (const entry of ingredients) {
    let qty, unit_key, ingredient_key, name;
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      ingredient_key = entry.ingredient_key || null;
      unit_key = entry.unit_key || '';
      qty = entry.quantity != null ? entry.quantity * mult : null;
      name = null;
    } else {
      const parsed = parseIngredient(String(entry).trim());
      if (!parsed) continue;
      qty = parsed.quantity != null ? parsed.quantity * mult : null;
      unit_key = parsed.unit || '';
      ingredient_key = null;
      name = parsed.name;
    }
    const key = ingredient_key != null ? `${ingredient_key}|${unit_key}` : `${unit_key}|${name}`;
    if (!merged.has(key)) {
      merged.set(key, { quantity: qty, unit_key, ingredient_key, name });
    } else {
      const cur = merged.get(key);
      if (qty != null) cur.quantity = (cur.quantity != null ? cur.quantity : 0) + qty;
    }
  }
}

// Aggregate ingredients from selected recipes (items: [{ recipe_id, servings }])
function aggregateFromRecipeItems(userId, items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const recipeIds = [...new Set(items.map((i) => parseInt(i.recipe_id, 10)).filter((id) => !Number.isNaN(id)))];
  if (recipeIds.length === 0) return [];
  const placeholders = recipeIds.map(() => '?').join(',');
  const saved = db.prepare(
    `SELECT recipe_id FROM user_recipes WHERE user_id = ? AND recipe_id IN (${placeholders})`
  ).all(userId, ...recipeIds);
  const allowedIds = new Set(saved.map((r) => r.recipe_id));
  const rows = db.prepare(
    `SELECT id, ingredients, servings AS recipe_servings FROM recipes WHERE id IN (${placeholders})`
  ).all(...recipeIds);
  const recipeMap = new Map(rows.map((r) => [r.id, r]));
  const merged = new Map();
  for (const item of items) {
    const recipeId = parseInt(item.recipe_id, 10);
    if (Number.isNaN(recipeId) || !allowedIds.has(recipeId)) continue;
    const recipe = recipeMap.get(recipeId);
    if (!recipe) continue;
    let ingredients = [];
    try {
      ingredients = JSON.parse(recipe.ingredients || '[]');
    } catch {
      ingredients = [];
    }
    const mult = multiplier(item.servings ?? 1, recipe.recipe_servings);
    mergeInto(merged, ingredients, mult);
  }
  const unitsRows = db.prepare('SELECT key, label_de, label_en FROM units').all();
  const unitMap = Object.fromEntries(unitsRows.map((u) => [u.key, u]));
  const ingredientsRows = db.prepare('SELECT key, label_de, label_en FROM ingredients').all();
  const ingredientMap = Object.fromEntries(ingredientsRows.map((i) => [i.key, i]));
  return Array.from(merged.entries()).map(([, v]) => {
    const unitLabel = v.unit_key ? (unitMap[v.unit_key]?.label_de || v.unit_key) : '';
    const ingLabel = v.ingredient_key
      ? (ingredientMap[v.ingredient_key]?.label_de || v.ingredient_key)
      : (v.name || '');
    const raw = formatMergedIngredient(v.quantity, unitLabel, ingLabel);
    return { raw, quantity: v.quantity, unit_key: v.unit_key || null, ingredient_key: v.ingredient_key || null };
  });
}

// POST /api/shopping-lists/generate — generate list from selected recipes
router.post('/generate', (req, res) => {
  const userId = req.userId;
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const result = aggregateFromRecipeItems(userId, items);
  res.json({ items: result });
});

// GET /api/shopping-lists — list saved shopping lists (optional)
router.get('/', (req, res) => {
  const userId = req.userId;
  const rows = db.prepare(
    'SELECT id, start_date, end_date, ingredients_json, created_at FROM shopping_lists WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(userId);
  res.json({ lists: rows.map((r) => ({ ...r, ingredients: JSON.parse(r.ingredients_json || '[]') })) });
});

// POST /api/shopping-lists — save current generated list
router.post('/', (req, res) => {
  const userId = req.userId;
  const { start_date: startDate, end_date: endDate, items } = req.body;
  const start = dateStr(startDate);
  const end = dateStr(endDate);
  if (!start || !end) return res.status(400).json({ error: 'start_date and end_date required' });

  const ingredientsJson = JSON.stringify(Array.isArray(items) ? items : []);
  const result = db.prepare(`
    INSERT INTO shopping_lists (user_id, start_date, end_date, ingredients_json)
    VALUES (?, ?, ?, ?)
  `).run(userId, start, end, ingredientsJson);

  const row = db.prepare('SELECT id, start_date, end_date, ingredients_json, created_at FROM shopping_lists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ list: { ...row, ingredients: JSON.parse(row.ingredients_json || '[]') } });
});

export default router;
