import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import recipeRoutes from './routes/recipes.js';
import mealScheduleRoutes from './routes/mealSchedules.js';
import shoppingListRoutes from './routes/shoppingLists.js';
import './db/index.js'; // ensure DB exists

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/meal-schedules', mealScheduleRoutes);
app.use('/api/shopping-lists', shoppingListRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Recipe Platform API running at http://localhost:${PORT}`);
});
