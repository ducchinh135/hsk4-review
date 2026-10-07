import { Hono } from 'hono';
import { readJson, requireUser } from '../middleware.js';

const MAX_WORDS = 1000;
const STATUSES = new Set(['k', 'r', '']);
const INVALID = { error: 'Dữ liệu không hợp lệ.' };
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;

// Each kind of per-word state the client syncs. Bind order: ?1 user, ?2 word, fields..., last = updated_at.
const KINDS = {
  marks: {
    required: true,
    valid: (v) => typeof v.s === 'string' && STATUSES.has(v.s),
    fields: (v) => [v.s],
    upsert: `INSERT INTO progress (user_id, word, status, updated_at) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(user_id, word) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
             WHERE excluded.updated_at > progress.updated_at`,
    select: 'SELECT word, status, updated_at FROM progress WHERE user_id = ?',
    row: (r) => ({ s: r.status, t: r.updated_at }),
  },
  srs: {
    required: false,
    valid: (v) =>
      isInt(v.due, 0, 100000) &&
      isInt(v.ivl, 0, 365) &&
      isInt(v.ease, 1300, 5000) &&
      isInt(v.reps, 0, 100000) &&
      isInt(v.lapses, 0, 100000) &&
      isInt(v.added, 0, 100000),
    fields: (v) => [v.due, v.ivl, v.ease, v.reps, v.lapses, v.added],
    upsert: `INSERT INTO srs (user_id, word, due, ivl, ease, reps, lapses, added, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(user_id, word) DO UPDATE SET due = excluded.due, ivl = excluded.ivl, ease = excluded.ease,
               reps = excluded.reps, lapses = excluded.lapses, added = excluded.added, updated_at = excluded.updated_at
             WHERE excluded.updated_at > srs.updated_at`,
    select: 'SELECT word, due, ivl, ease, reps, lapses, added, updated_at FROM srs WHERE user_id = ?',
    row: (r) => ({ due: r.due, ivl: r.ivl, ease: r.ease, reps: r.reps, lapses: r.lapses, added: r.added, t: r.updated_at }),
  },
};

const sync = new Hono();

// Merge the client's marks and SRS cards into the server's (last write wins per word, by the
// client edit time `t`) and return the merged state for the whole account. `srs` is optional
// so older clients that only send `marks` keep working.
sync.post('/sync', requireUser, async (c) => {
  const db = c.env.DB;
  const uid = c.get('uid');
  const body = await readJson(c);
  if (!body) return c.json(INVALID, 400);

  const maxT = Date.now() + 864e5; // ignore timestamps from the far future
  const stmts = [];
  for (const [name, kind] of Object.entries(KINDS)) {
    const data = body[name];
    if (data === undefined && !kind.required) continue;
    if (!data || typeof data !== 'object') return c.json(INVALID, 400);
    const incoming = Object.entries(data);
    if (incoming.length > MAX_WORDS) return c.json({ error: 'Quá nhiều từ.' }, 413);
    for (const [word, v] of incoming) {
      if (word.length === 0 || word.length > 12) return c.json(INVALID, 400);
      if (!v || typeof v !== 'object' || !kind.valid(v) || !Number.isFinite(v.t) || v.t <= 0 || v.t > maxT) {
        return c.json(INVALID, 400);
      }
      stmts.push(db.prepare(kind.upsert).bind(uid, word, ...kind.fields(v), Math.floor(v.t)));
    }
  }
  // D1 batches are transactional; chunk to stay well under statement limits.
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));

  const out = {};
  for (const [name, kind] of Object.entries(KINDS)) {
    const { results } = await db.prepare(kind.select).bind(uid).all();
    out[name] = {};
    for (const r of results) out[name][r.word] = kind.row(r);
  }
  return c.json(out);
});

export default sync;
