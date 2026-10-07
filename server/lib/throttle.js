// Failed login / register throttling, stored in D1 (`attempts` table).
const WINDOW_MS = 15 * 60 * 1000;

export async function tooManyAttempts(db, key, limit) {
  const row = await db.prepare('SELECT count, window_start FROM attempts WHERE key = ?').bind(key).first();
  if (!row) return false;
  if (Date.now() - row.window_start > WINDOW_MS) return false;
  return row.count >= limit;
}

export async function recordAttempt(db, key) {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO attempts (key, count, window_start) VALUES (?1, 1, ?2)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN ?2 - window_start > ${WINDOW_MS} THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN ?2 - window_start > ${WINDOW_MS} THEN ?2 ELSE window_start END`
    )
    .bind(key, now)
    .run();
}

export async function clearAttempts(db, key) {
  await db.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run();
}
