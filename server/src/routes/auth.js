import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db/index.js';
import { authMiddleware, signToken } from '../middleware/auth.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';
import { insertLog } from '../services/logService.js';

const router = express.Router();

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

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
  // Store as SQLite-friendly "YYYY-MM-DD HH:MM:SS" (no ms) so datetime() comparison works
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  try {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, display_name, is_admin, verification_token, verification_token_expires_at, onboarding_completed)
      VALUES (?, ?, ?, 0, ?, ?, 0)
    `);
    const result = stmt.run(emailNorm, passwordHash, displayNameTrimmed, verificationToken, expiresAt);
    const userId = result.lastInsertRowid;

    const verificationLink = `${FRONTEND_URL.replace(/\/$/, '')}/verify-email?token=${verificationToken}`;
    await sendVerificationEmail(emailNorm, verificationLink, displayNameTrimmed);

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
    'SELECT id, email, password_hash, display_name, is_admin, email_verified_at, onboarding_completed, blocked FROM users WHERE email = ?'
  ).get(emailNorm);

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (row.blocked) {
    return res.status(403).json({
      error: 'Account is locked',
      code: 'ACCOUNT_BLOCKED',
    });
  }

  if (!row.email_verified_at) {
    return res.status(403).json({
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(row.id);
  insertLog(db, {
    userId: row.id,
    userEmail: row.email,
    userDisplayName: row.display_name,
    action: 'login',
    category: 'info',
  });
  const token = signToken(row.id, row.email);
  res.json({
    token,
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: row.is_admin ? 1 : 0,
      onboarding_completed: row.onboarding_completed ? 1 : 0,
    },
  });
});

router.get('/me', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT id, email, display_name, is_admin, created_at, onboarding_completed FROM users WHERE id = ?').get(req.userId);
  if (!row) return res.status(401).json({ error: 'User not found' });
  res.json({
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: row.is_admin ? 1 : 0,
      created_at: row.created_at,
      onboarding_completed: row.onboarding_completed ? 1 : 0,
    },
  });
});

router.patch('/me', authMiddleware, (req, res) => {
  const { display_name: displayName, onboarding_completed: onboardingCompleted } = req.body;
  const userId = req.userId;
  const updates = [];
  const params = [];

  if (displayName !== undefined) {
    const value = String(displayName).trim() || null;
    if (value) {
      const existing = db.prepare(
        'SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) AND id != ?'
      ).get(value, userId);
      if (existing) {
        return res.status(409).json({ error: 'Nutzername bereits vergeben' });
      }
    }
    updates.push('display_name = ?');
    params.push(value);
  }

  if (typeof onboardingCompleted === 'boolean') {
    updates.push('onboarding_completed = ?');
    params.push(onboardingCompleted ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'display_name or onboarding_completed is required' });
  }

  params.push(userId);
  try {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Invalid value' });
    }
    throw err;
  }
  const row = db.prepare('SELECT id, email, display_name, is_admin, created_at, onboarding_completed FROM users WHERE id = ?').get(userId);
  res.json({
    user: {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: row.is_admin ? 1 : 0,
      created_at: row.created_at,
      onboarding_completed: row.onboarding_completed ? 1 : 0,
    },
  });
});

router.post('/resend-verification-email', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.prepare(
    'SELECT id, email, display_name, email_verified_at FROM users WHERE email = ?'
  ).get(email);

  if (!user || user.email_verified_at) {
    return res.json({
      message: 'If your email is registered and not yet verified, we sent a new verification link.',
    });
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  db.prepare(
    'UPDATE users SET verification_token = ?, verification_token_expires_at = ? WHERE id = ?'
  ).run(verificationToken, expiresAt, user.id);

  const verificationLink = `${FRONTEND_URL.replace(/\/$/, '')}/verify-email?token=${verificationToken}`;
  await sendVerificationEmail(user.email, verificationLink, user.display_name || '');

  return res.json({
    message: 'If your email is registered and not yet verified, we sent a new verification link.',
  });
});

router.get('/verify-email', (req, res) => {
  let token = (req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    if (token.includes('%')) token = decodeURIComponent(token);
  } catch (_) {}

  const row = db.prepare(
    'SELECT id, verification_token_expires_at FROM users WHERE verification_token = ?'
  ).get(token);

  if (!row) {
    return res.status(400).json({
      error: 'Invalid or expired token',
      code: 'INVALID_OR_EXPIRED_TOKEN',
    });
  }

  // Check expiry in Node (avoids SQLite datetime quirks)
  const expiresAt = row.verification_token_expires_at;
  if (expiresAt) {
    const expiryDate = new Date(expiresAt.replace(' ', 'T') + 'Z');
    if (Date.now() > expiryDate.getTime()) {
      return res.status(400).json({
        error: 'Token expired. Please register again or request a new verification email.',
        code: 'TOKEN_EXPIRED',
      });
    }
  }

  db.prepare(
    'UPDATE users SET email_verified_at = datetime(\'now\'), verification_token = NULL, verification_token_expires_at = NULL WHERE id = ?'
  ).run(row.id);

  res.json({ success: true, message: 'Email verified. You can now log in.' });
});

router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const genericMessage =
    'If an account exists with this email, we sent a link to reset your password.';

  const user = db.prepare(
    'SELECT id, email, display_name FROM users WHERE email = ?'
  ).get(email);

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    db.prepare(
      'UPDATE users SET password_reset_token = ?, password_reset_token_expires_at = ? WHERE id = ?'
    ).run(resetToken, expiresAt, user.id);
    const resetLink = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(user.email, resetLink, user.display_name || '');
  }

  return res.json({ message: genericMessage });
});

router.post('/reset-password', (req, res) => {
  let token = (req.body.token || '').trim();
  try {
    if (token.includes('%')) token = decodeURIComponent(token);
  } catch (_) {}
  const { new_password: newPassword } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({ error: 'New password must contain both letters and numbers' });
  }

  const row = db.prepare(
    'SELECT id, password_reset_token_expires_at FROM users WHERE password_reset_token = ?'
  ).get(token);

  if (!row) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  const expiresAt = row.password_reset_token_expires_at;
  if (expiresAt) {
    const expiryDate = new Date(expiresAt.replace(' ', 'T') + 'Z');
    if (Date.now() > expiryDate.getTime()) {
      return res.status(400).json({ error: 'Token expired' });
    }
  }

  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = ?'
  ).run(passwordHash, row.id);

  return res.json({ success: true, message: 'Password has been reset. You can now log in.' });
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

router.delete('/me', authMiddleware, (req, res) => {
  const userId = req.userId;
  const row = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(userId);
  if (!row) {
    return res.status(401).json({ error: 'User not found' });
  }
  insertLog(db, {
    userId: row.id,
    userEmail: row.email,
    userDisplayName: row.display_name,
    action: 'delete_account_self',
    category: 'info',
  });
  const collectionIds = db.prepare('SELECT id FROM collections WHERE user_id = ?').all(userId).map((r) => r.id);
  if (collectionIds.length > 0) {
    const placeholders = collectionIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM collection_recipes WHERE collection_id IN (${placeholders})`).run(...collectionIds);
  }
  db.prepare('DELETE FROM collections WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM meal_schedules WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM user_recipes WHERE user_id = ?').run(userId);
  db.prepare('UPDATE recipes SET created_by_user_id = NULL WHERE created_by_user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ success: true, message: 'Account deleted.' });
});

export default router;
