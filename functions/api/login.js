import {
  clearAttempts,
  clientIp,
  fail,
  guardPost,
  hashPassword,
  json,
  makeSessionCookie,
  readJson,
  recordAttempt,
  safeEqual,
  tooManyAttempts,
} from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const bad = guardPost(request);
  if (bad) return bad;

  const body = await readJson(request);
  if (!body) return fail(400, 'Dữ liệu không hợp lệ.');
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  if (!username || !password || password.length > 200) return fail(400, 'Nhập tên đăng nhập và mật khẩu.');

  const ip = clientIp(request);
  const userKey = `login:${ip}:${username.toLowerCase()}`;
  const ipKey = `login:${ip}`;
  if ((await tooManyAttempts(env, userKey, 8)) || (await tooManyAttempts(env, ipKey, 40))) {
    return fail(429, 'Thử quá nhiều lần. Hãy đợi 15 phút rồi thử lại.');
  }

  const user = await env.DB.prepare('SELECT id, username, pass_hash, salt FROM users WHERE username = ?').bind(username).first();
  // Hash even for unknown users so response time does not reveal which names exist.
  const { hash } = await hashPassword(password, user ? user.salt : 'AAAAAAAAAAAAAAAAAAAAAA');
  if (!user || !safeEqual(hash, user.pass_hash)) {
    await recordAttempt(env, userKey);
    await recordAttempt(env, ipKey);
    return fail(401, 'Sai tên đăng nhập hoặc mật khẩu.');
  }

  await clearAttempts(env, userKey);
  return json({ user: { username: user.username } }, 200, { 'set-cookie': await makeSessionCookie(env, request, user.id) });
}
