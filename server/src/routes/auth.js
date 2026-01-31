import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { authMiddleware, signToken } from '../middleware/auth.js';

const router = express.Router();

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

router.post('/register', (req, res) => {
  const { email, password, display_name: displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ error: 'Password must contain both letters and numbers' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const passwordHash = bcrypt.hashSync(password, 10);

  try {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, display_name, is_admin)
      VALUES (?, ?, ?, 0)
    `);
    const result = stmt.run(emailNorm, passwordHash, displayName?.trim() || null);
    const userId = result.lastInsertRowid;

    const token = signToken(userId, emailNorm);
    res.status(201).json({
      token,
      user: {
        id: userId,
        email: emailNorm,
        display_name: displayName?.trim() || null,
        is_admin: 0,
      },
    });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const row = db.prepare('SELECT id, email, password_hash, display_name, is_admin FROM users WHERE email = ?').get(emailNorm);

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(row.id, row.email);
  res.json({
    token,
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: row.is_admin ? 1 : 0,
    },
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = ?').get(req.userId);
  if (!row) return res.status(401).json({ error: 'User not found' });
  res.json({
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: row.is_admin ? 1 : 0,
      created_at: row.created_at,
    },
  });
});

router.patch('/me', authMiddleware, (req, res) => {
  const { display_name: displayName } = req.body;
  const userId = req.userId;
  const value = displayName != null ? String(displayName).trim() || null : undefined;
  if (value === undefined) {
    return res.status(400).json({ error: 'display_name is required' });
  }
  if (value) {
    const existing = db.prepare(
      'SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) AND id != ?'
    ).get(value, userId);
    if (existing) {
      return res.status(409).json({ error: 'Nutzername bereits vergeben' });
    }
  }
  try {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(value, userId);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Invalid value' });
    }
    throw err;
  }
  const row = db.prepare('SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = ?').get(userId);
  res.json({
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: row.is_admin ? 1 : 0,
      created_at: row.created_at,
    },
  });
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { current_password: currentPassword, new_password: newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({ error: 'New password must contain both letters and numbers' });
  }
  const row = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.userId);
  if (!row || !bcrypt.compareSync(currentPassword, row.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.userId);
  res.json({ success: true });
});

export default router;
