/**
 * Insert an audit log entry for the admin log viewer.
 * @param {object} db - better-sqlite3 database instance
 * @param {object} opts - { userId?, userEmail?, userDisplayName?, action, category?, details? }
 * @param {string} opts.action - e.g. 'login', 'recipe_saved', 'api_error'
 * @param {string} [opts.category='info'] - 'info' | 'error'
 */
export function insertLog(db, opts) {
  const { userId, userEmail, userDisplayName, action, category = 'info', details = null } = opts;
  let email = userEmail ?? null;
  let displayName = userDisplayName ?? null;
  if (userId != null && (email == null || displayName == null)) {
    const row = db.prepare('SELECT email, display_name FROM users WHERE id = ?').get(userId);
    if (row) {
      if (email == null) email = row.email;
      if (displayName == null) displayName = row.display_name ?? null;
    }
  }
  db.prepare(
    `INSERT INTO admin_logs (user_id, user_email, user_display_name, action, category, details)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId ?? null, email ?? '', displayName ?? null, action, category, details);
}
