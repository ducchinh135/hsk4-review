import { getUserId } from './lib/session.js';

// Never cache API responses.
export async function noStore(c, next) {
  await next();
  c.header('cache-control', 'no-store');
}

// CSRF guard: reject cross-site POSTs and non-JSON bodies.
export async function guardPost(c, next) {
  if (c.req.method === 'POST') {
    const origin = c.req.header('origin');
    if (origin && new URL(origin).host !== new URL(c.req.url).host) return c.json({ error: 'Yêu cầu không hợp lệ.' }, 403);
    if (!(c.req.header('content-type') || '').includes('application/json')) return c.json({ error: 'Cần gửi JSON.' }, 415);
  }
  await next();
}

// Sets c.var.uid or answers 401.
export async function requireUser(c, next) {
  const uid = await getUserId(c.env, c.req.raw);
  if (!uid) return c.json({ error: 'Chưa đăng nhập.' }, 401);
  c.set('uid', uid);
  await next();
}

export async function readJson(c) {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

export const clientIp = (c) => c.req.header('cf-connecting-ip') || 'local';
