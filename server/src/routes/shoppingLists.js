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

// Aggregate ingredients: parse each line, group by (name, unit), sum quantities
function aggregateIngredients(userId, startDate, endDate) {
  const rows = db.prepare(`
    SELECT r.ingredients, ms.servings, r.servings AS recipe_servings
    FROM meal_schedules ms
    JOIN recipes r ON r.id = ms.recipe_id
    WHERE ms.user_id = ? AND ms.meal_date >= ? AND ms.meal_date <= ?
  `).all(userId, startDate, endDate);

  const multiplier = (servings, recipeServings) => {
    if (!recipeServings || recipeServings <= 0) return 1;
    return (servings || 1) / recipeServings;
  };

  const merged = new Map(); // key = `${unit}|${name}` -> { quantity, unit, name }
  for (const row of rows) {
    let ingredients = [];
    try {
      ingredients = JSON.parse(row.ingredients || '[]');
    } catch {
      ingredients = [];
    }
    const mult = multiplier(row.servings, row.recipe_servings);
    for (const line of ingredients) {
      const parsed = parseIngredient(line);
      if (!parsed) continue;
      const qty = parsed.quantity != null ? parsed.quantity * mult : null;
      const key = `${parsed.unit}|${parsed.name}`;
      if (!merged.has(key)) {
        merged.set(key, { quantity: qty, unit: parsed.unit, name: parsed.name });
      } else {
        const entry = merged.get(key);
        if (qty != null) {
          entry.quantity = (entry.quantity != null ? entry.quantity : 0) + qty;
        }
      }
    }
  }

  return Array.from(merged.entries()).map(([, v]) => ({
    raw: formatMergedIngredient(v.quantity, v.unit, v.name),
    name: v.name,
    unit: v.unit,
    quantity: v.quantity,
  }));
}

// GET /api/shopping-lists/generate?start=YYYY-MM-DD&end=YYYY-MM-DD — generate list for date range
router.get('/generate', (req, res) => {
  const userId = req.userId;
  const start = dateStr(req.query.start) || dateStr(new Date());
  const end = dateStr(req.query.end) || start;

  const items = aggregateIngredients(userId, start, end);
  res.json({ start, end, items });
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
