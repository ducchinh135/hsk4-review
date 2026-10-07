import { Hono } from 'hono';
import { hashPassword, safeEqual } from '../lib/crypto.js';
import { clearSessionCookie, getUserId, makeSessionCookie } from '../lib/session.js';
import { clearAttempts, recordAttempt, tooManyAttempts } from '../lib/throttle.js';
import { clientIp, readJson } from '../middleware.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const THROTTLED = 'Thử quá nhiều lần. Hãy đợi 15 phút rồi thử lại.';

const auth = new Hono();

auth.get('/me', async (c) => {
  const uid = await getUserId(c.env, c.req.raw);
  if (!uid) return c.json({ user: null });
  const user = await c.env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(uid).first();
  return c.json({ user: user ? { username: user.username } : null });
});

auth.post('/register', async (c) => {
  const db = c.env.DB;
  const ipKey = `register:${clientIp(c)}`;
  if (await tooManyAttempts(db, ipKey, 10)) return c.json({ error: THROTTLED }, 429);

  const body = await readJson(c);
  if (!body) return c.json({ error: 'Dữ liệu không hợp lệ.' }, 400);
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  const invite = String(body.invite ?? '');

  if (!c.env.INVITE_CODE) return c.json({ error: 'Chưa mở đăng ký.' }, 403);
  if (!safeEqual(invite, c.env.INVITE_CODE)) {
    await recordAttempt(db, ipKey);
    return c.json({ error: 'Mã mời không đúng.' }, 403);
  }
  if (!USERNAME_RE.test(username)) {
    return c.json({ error: 'Tên đăng nhập gồm 3–20 ký tự: chữ không dấu, số hoặc dấu gạch dưới.' }, 400);
  }
  if (password.length < 8 || password.length > 200) return c.json({ error: 'Mật khẩu cần từ 8 ký tự.' }, 400);

  const { hash, salt } = await hashPassword(password);
  let id;
  try {
    const res = await db
      .prepare('INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)')
      .bind(username, hash, salt, Date.now())
      .run();
    id = res.meta.last_row_id;
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      await recordAttempt(db, ipKey);
      return c.json({ error: 'Tên đăng nhập đã có người dùng.' }, 409);
    }
    throw e;
  }

  c.header('set-cookie', await makeSessionCookie(c.env, c.req.raw, id));
  return c.json({ user: { username } }, 201);
});

auth.post('/login', async (c) => {
  const db = c.env.DB;
  const body = await readJson(c);
  if (!body) return c.json({ error: 'Dữ liệu không hợp lệ.' }, 400);
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  if (!username || !password || password.length > 200) return c.json({ error: 'Nhập tên đăng nhập và mật khẩu.' }, 400);

  const ip = clientIp(c);
  const userKey = `login:${ip}:${username.toLowerCase()}`;
  const ipKey = `login:${ip}`;
  if ((await tooManyAttempts(db, userKey, 8)) || (await tooManyAttempts(db, ipKey, 40))) {
    return c.json({ error: THROTTLED }, 429);
  }

  const user = await db.prepare('SELECT id, username, pass_hash, salt FROM users WHERE username = ?').bind(username).first();
  // Hash even for unknown users so response time does not reveal which names exist.
  const { hash } = await hashPassword(password, user ? user.salt : 'AAAAAAAAAAAAAAAAAAAAAA');
  if (!user || !safeEqual(hash, user.pass_hash)) {
    await recordAttempt(db, userKey);
    await recordAttempt(db, ipKey);
    return c.json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' }, 401);
  }

  await clearAttempts(db, userKey);
  c.header('set-cookie', await makeSessionCookie(c.env, c.req.raw, user.id));
  return c.json({ user: { username: user.username } });
});

auth.post('/logout', (c) => {
  c.header('set-cookie', clearSessionCookie(c.req.raw));
  return c.json({ ok: true });
});

export default auth;
