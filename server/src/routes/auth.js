import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/index.js';
import { authMiddleware, signToken } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/email.js';

const router = express.Router();

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

router.post('/register', async (req, res) => {
  const { email, password, display_name: displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const displayNameTrimmed = displayName != null ? String(displayName).trim() : '';
  if (!displayNameTrimmed) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ error: 'Password must contain both letters and numbers' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const passwordHash = bcrypt.hashSync(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .replace('Z', '');

  try {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, display_name, is_admin, verification_token, verification_token_expires_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `);
    const result = stmt.run(emailNorm, passwordHash, displayNameTrimmed, verificationToken, expiresAt);
    const userId = result.lastInsertRowid;

    const verificationLink = `${FRONTEND_URL.replace(/\/$/, '')}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(emailNorm, verificationLink);

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      email: emailNorm,
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
  const row = db.prepare(
    'SELECT id, email, password_hash, display_name, is_admin, email_verified_at FROM users WHERE email = ?'
  ).get(emailNorm);

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!row.email_verified_at) {
    return res.status(403).json({
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED',
    });
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

router.get('/verify-email', (req, res) => {
  const token = (req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  const row = db.prepare(
    'SELECT id FROM users WHERE verification_token = ? AND verification_token_expires_at > datetime(\'now\')'
  ).get(token);

  if (!row) {
    return res.status(400).json({
      error: 'Invalid or expired token',
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  }

  db.prepare(
    'UPDATE users SET email_verified_at = datetime(\'now\'), verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?'
  ).run(row.id);

  res.json({ success: true, message: 'Email verified. You can now log in.' });
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
