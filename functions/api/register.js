import {
  USERNAME_RE,
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

  const ipKey = `register:${clientIp(request)}`;
  if (await tooManyAttempts(env, ipKey, 10)) return fail(429, 'Thử quá nhiều lần. Hãy đợi 15 phút rồi thử lại.');

  const body = await readJson(request);
  if (!body) return fail(400, 'Dữ liệu không hợp lệ.');
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  const invite = String(body.invite ?? '');

  if (!env.INVITE_CODE) return fail(403, 'Chưa mở đăng ký.');
  if (!safeEqual(invite, env.INVITE_CODE)) {
    await recordAttempt(env, ipKey);
    return fail(403, 'Mã mời không đúng.');
  }
  if (!USERNAME_RE.test(username)) return fail(400, 'Tên đăng nhập gồm 3–20 ký tự: chữ không dấu, số hoặc dấu gạch dưới.');
  if (password.length < 8 || password.length > 200) return fail(400, 'Mật khẩu cần từ 8 ký tự.');

  const { hash, salt } = await hashPassword(password);
  let id;
  try {
    const res = await env.DB.prepare('INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)')
      .bind(username, hash, salt, Date.now())
      .run();
    id = res.meta.last_row_id;
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      await recordAttempt(env, ipKey);
      return fail(409, 'Tên đăng nhập đã có người dùng.');
    }
    throw e;
  }

  return json({ user: { username } }, 201, { 'set-cookie': await makeSessionCookie(env, request, id) });
}
