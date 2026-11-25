import { Hono } from 'hono';
import { readJson, requireUser } from '../middleware.js';

const MAX_PER_REQUEST = 100;
const MAX_DATA = 20000; // bytes of JSON per attempt
const INVALID = { error: 'Dữ liệu không hợp lệ.' };
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;

const valid = (a, maxT) =>
  a &&
  typeof a === 'object' &&
  typeof a.id === 'string' &&
  /^[a-z0-9-]{1,40}$/i.test(a.id) &&
  isInt(a.test, 1, 999) &&
  (a.mode === 'study' || a.mode === 'real') &&
  isInt(a.at, 0, maxT) &&
  isInt(a.upd, 1, maxT) &&
  (a.deleted === undefined || typeof a.deleted === 'boolean') &&
  a.data &&
  typeof a.data === 'object' &&
  !Array.isArray(a.data);

const UPSERT = `INSERT INTO exam_attempts (user_id, id, test, mode, started_at, updated_at, deleted, data)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
  ON CONFLICT(user_id, id) DO UPDATE SET test = excluded.test, mode = excluded.mode, started_at = excluded.started_at,
    updated_at = excluded.updated_at, deleted = excluded.deleted, data = excluded.data
  WHERE excluded.updated_at > exam_attempts.updated_at`;

const exams = new Hono();

// Merge the client's changed attempts into the server's (last write wins per attempt, by the client edit
// time `upd`) and return every attempt of the account, deleted ones included so that other devices drop them.
exams.post('/exam-sync', requireUser, async (c) => {
  const db = c.env.DB;
  const uid = c.get('uid');
  const body = await readJson(c);
  if (!body || !Array.isArray(body.attempts)) return c.json(INVALID, 400);
  if (body.attempts.length > MAX_PER_REQUEST) return c.json({ error: 'Quá nhiều bài làm.' }, 413);

  const maxT = Date.now() + 864e5; // ignore timestamps from the far future
  const stmts = [];
  for (const a of body.attempts) {
    if (!valid(a, maxT)) return c.json(INVALID, 400);
    const data = a.deleted ? '{}' : JSON.stringify(a.data);
    if (data.length > MAX_DATA) return c.json({ error: 'Bài làm quá lớn.' }, 413);
    stmts.push(db.prepare(UPSERT).bind(uid, a.id, a.test, a.mode, a.at, a.upd, a.deleted ? 1 : 0, data));
  }
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));

  const { results } = await db.prepare('SELECT id, test, mode, started_at, updated_at, deleted, data FROM exam_attempts WHERE user_id = ?').bind(uid).all();
  return c.json({
    attempts: results.map((r) => ({ id: r.id, test: r.test, mode: r.mode, at: r.started_at, upd: r.updated_at, deleted: !!r.deleted, data: JSON.parse(r.data) })),
  });
});

export default exams;
