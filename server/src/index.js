import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import recipeRoutes from './routes/recipes.js';
import collectionRoutes from './routes/collections.js';
import adminRoutes from './routes/admin.js';
import db from './db/index.js';
import { insertLog } from './services/logService.js';

const app = express();
app.set('trust proxy', 1); // Trust first proxy (nginx) for X-Forwarded-For, rate limiting, etc.
const PORT = process.env.PORT || 3001;

const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const corsOrigin = frontendUrl
  ? [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : true;
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
  validate: { xForwardedForHeader: false },
});
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err);
  try {
    insertLog(db, {
      userId: req.userId ?? null,
      userEmail: req.userEmail ?? null,
      action: 'api_error',
      category: 'error',
      details: err.message || String(err),
    });
  } catch (logErr) {
    console.error('Failed to write audit log:', logErr);
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Recipe Platform API running at http://localhost:${PORT}`);
});
