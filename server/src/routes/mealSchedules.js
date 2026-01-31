import express from 'express';
import db from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

// Single slot per day: all entries use meal_type 'meal'
const DEFAULT_MEAL_TYPE = 'meal';

function dateStr(d) {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

// GET /api/meal-schedules?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', (req, res) => {
  const userId = req.userId;
  const start = dateStr(req.query.start) || dateStr(new Date());
  const end = dateStr(req.query.end) || start;

  const rows = db.prepare(`
    SELECT ms.id, ms.recipe_id, ms.meal_date, ms.meal_type, ms.servings, ms.sort_order, ms.created_at,
           r.title AS recipe_title, r.image_url AS recipe_image_url
    FROM meal_schedules ms
    JOIN recipes r ON r.id = ms.recipe_id
    WHERE ms.user_id = ? AND ms.meal_date >= ? AND ms.meal_date <= ?
    ORDER BY ms.meal_date, ms.sort_order
  `).all(userId, start, end);

  res.json({ schedules: rows });
});

// POST /api/meal-schedules — add recipe to a day (one slot per day, multiple recipes per day)
router.post('/', (req, res) => {
  const userId = req.userId;
  const { recipe_id: recipeId, meal_date: mealDate, servings } = req.body;

  const date = dateStr(mealDate);
  if (!date) return res.status(400).json({ error: 'Valid meal_date (YYYY-MM-DD) required' });
  const rid = parseInt(recipeId, 10);
  if (Number.isNaN(rid)) return res.status(400).json({ error: 'Valid recipe_id required' });

  const recipe = db.prepare('SELECT id FROM recipes WHERE id = ?').get(rid);
  if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

  const maxOrder = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM meal_schedules WHERE user_id = ? AND meal_date = ?'
  ).get(userId, date);
  const sortOrder = maxOrder?.next_order ?? 0;

  const result = db.prepare(`
    INSERT INTO meal_schedules (user_id, recipe_id, meal_date, meal_type, servings, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, rid, date, DEFAULT_MEAL_TYPE, parseInt(servings, 10) || 1, sortOrder);

  const row = db.prepare(`
    SELECT ms.id, ms.recipe_id, ms.meal_date, ms.meal_type, ms.servings, ms.sort_order, ms.created_at,
           r.title AS recipe_title, r.image_url AS recipe_image_url
    FROM meal_schedules ms
    JOIN recipes r ON r.id = ms.recipe_id
    WHERE ms.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ schedule: row });
});

// PATCH /api/meal-schedules/:id — update servings or move to another day
router.patch('/:id', (req, res) => {
  const userId = req.userId;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid schedule ID' });

  const existing = db.prepare('SELECT id, meal_date FROM meal_schedules WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) return res.status(404).json({ error: 'Schedule not found' });

  const { servings, meal_date: mealDate } = req.body;
  const updates = [];
  const values = [];

  if (servings !== undefined) {
    updates.push('servings = ?');
    values.push(parseInt(servings, 10) || 1);
  }
  if (mealDate && dateStr(mealDate)) {
    updates.push('meal_date = ?');
    values.push(dateStr(mealDate));
  }

  if (updates.length === 0) {
    const row = db.prepare(`
      SELECT ms.id, ms.recipe_id, ms.meal_date, ms.meal_type, ms.servings, ms.sort_order, ms.created_at,
             r.title AS recipe_title, r.image_url AS recipe_image_url
      FROM meal_schedules ms
      JOIN recipes r ON r.id = ms.recipe_id
      WHERE ms.id = ?
    `).get(id);
    return res.json({ schedule: row });
  }

  values.push(id);
  db.prepare(`UPDATE meal_schedules SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const row = db.prepare(`
    SELECT ms.id, ms.recipe_id, ms.meal_date, ms.meal_type, ms.servings, ms.sort_order, ms.created_at,
           r.title AS recipe_title, r.image_url AS recipe_image_url
    FROM meal_schedules ms
    JOIN recipes r ON r.id = ms.recipe_id
    WHERE ms.id = ?
  `).get(id);

  res.json({ schedule: row });
});

// DELETE /api/meal-schedules/:id
router.delete('/:id', (req, res) => {
  const userId = req.userId;
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid schedule ID' });

  const result = db.prepare('DELETE FROM meal_schedules WHERE id = ? AND user_id = ?').run(id, userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Schedule not found' });
  res.status(204).send();
});

// POST /api/meal-schedules/copy-week — copy previous week
router.post('/copy-week', (req, res) => {
  const userId = req.userId;
  const { from_start: fromStart, to_start: toStart } = req.body;
  const from = dateStr(fromStart);
  const to = dateStr(toStart);
  if (!from || !to) return res.status(400).json({ error: 'from_start and to_start (YYYY-MM-DD) required' });

  const rows = db.prepare(
    'SELECT recipe_id, meal_date, servings, sort_order FROM meal_schedules WHERE user_id = ? AND meal_date >= ? AND meal_date < date(?, "+7 days")'
  ).all(userId, from, from);

  const insert = db.prepare(`
    INSERT INTO meal_schedules (user_id, recipe_id, meal_date, meal_type, servings, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const startFrom = new Date(from);
  const startTo = new Date(to);
  for (const row of rows) {
    const fromDate = new Date(row.meal_date);
    const dayOffset = Math.round((fromDate - startFrom) / (24 * 60 * 60 * 1000));
    const toDate = new Date(startTo);
    toDate.setDate(startTo.getDate() + dayOffset);
    insert.run(userId, row.recipe_id, dateStr(toDate), DEFAULT_MEAL_TYPE, row.servings, row.sort_order);
  }

  res.json({ copied: rows.length });
});

export default router;
