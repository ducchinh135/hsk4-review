import { fail, getUserId, guardPost, json, readJson } from '../_lib/auth.js';

const MAX_WORDS = 1000;
const STATUSES = new Set(['k', 'r', '']);

// Merge the client's marks into the server's (last write wins per word, by the
// client edit time `t`) and return the merged state for the whole account.
export async function onRequestPost({ request, env }) {
  const bad = guardPost(request);
  if (bad) return bad;
  const uid = await getUserId(env, request);
  if (!uid) return fail(401, 'Chưa đăng nhập.');

  const body = await readJson(request);
  const incoming = body && body.marks && typeof body.marks === 'object' ? Object.entries(body.marks) : null;
  if (!incoming) return fail(400, 'Dữ liệu không hợp lệ.');
  if (incoming.length > MAX_WORDS) return fail(413, 'Quá nhiều từ.');

  const maxT = Date.now() + 864e5; // ignore timestamps from the far future
  const stmts = [];
  for (const [word, v] of incoming) {
    if (typeof word !== 'string' || word.length === 0 || word.length > 12) return fail(400, 'Dữ liệu không hợp lệ.');
    if (!v || typeof v.s !== 'string' || !STATUSES.has(v.s) || !Number.isFinite(v.t) || v.t <= 0 || v.t > maxT) {
      return fail(400, 'Dữ liệu không hợp lệ.');
    }
    stmts.push(
      env.DB.prepare(
        `INSERT INTO progress (user_id, word, status, updated_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(user_id, word) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
         WHERE excluded.updated_at > progress.updated_at`
      ).bind(uid, word, v.s, Math.floor(v.t))
    );
  }
  // D1 batches are transactional; chunk to stay well under statement limits.
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));

  const { results } = await env.DB.prepare('SELECT word, status, updated_at FROM progress WHERE user_id = ?').bind(uid).all();
  const marks = {};
  for (const r of results) marks[r.word] = { s: r.status, t: r.updated_at };
  return json({ marks });
}
