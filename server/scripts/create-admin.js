/**
 * Erstellt einen Admin-User (z. B. den ersten). Der User ist sofort verifiziert und kann sich einloggen.
 *
 * Aufruf (auf dem Server im Ordner server/):
 *   node -r dotenv/config scripts/create-admin.js <email> <passwort>
 * oder mit Umgebungsvariablen:
 *   ADMIN_EMAIL=admin@beispiel.de ADMIN_PASSWORD=DeinSicheresPasswort node -r dotenv/config scripts/create-admin.js
 *
 * Passwort: mind. 8 Zeichen, Buchstaben und Zahlen.
 */

import bcrypt from 'bcryptjs';
import db from '../src/db/index.js';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const email = process.env.ADMIN_EMAIL || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];
const displayName = process.env.ADMIN_DISPLAY_NAME || process.argv[4] || 'Admin';

if (!email || !password) {
  console.error('Verwendung: node -r dotenv/config scripts/create-admin.js <email> <passwort> [display_name]');
  console.error('  oder: ADMIN_EMAIL=... ADMIN_PASSWORD=... node -r dotenv/config scripts/create-admin.js');
  process.exit(1);
}

if (password.length < PASSWORD_MIN_LENGTH) {
  console.error('Fehler: Passwort muss mindestens 8 Zeichen haben.');
  process.exit(1);
}

if (!PASSWORD_REGEX.test(password)) {
  console.error('Fehler: Passwort muss Buchstaben und Zahlen enthalten.');
  process.exit(1);
}

const emailNorm = String(email).trim().toLowerCase();
const passwordHash = bcrypt.hashSync(password, 10);

try {
  const stmt = db.prepare(`
    INSERT INTO users (
      email, password_hash, display_name, is_admin,
      email_verified_at, verification_token, verification_token_expires_at
    ) VALUES (?, ?, ?, 1, datetime('now'), NULL, NULL)
  `);
  stmt.run(emailNorm, passwordHash, displayName.trim() || 'Admin');
  console.log('Admin-User angelegt:', emailNorm);
  console.log('Du kannst dich jetzt mit dieser E-Mail und dem Passwort einloggen.');
} catch (err) {
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    console.error('Fehler: E-Mail ist bereits registriert:', emailNorm);
    process.exit(1);
  }
  throw err;
}
