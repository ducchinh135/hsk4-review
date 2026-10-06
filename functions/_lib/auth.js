// Shared helpers for the API: password hashing, signed session cookies, JSON
// responses, CSRF guard and attempt throttling. Uses only WebCrypto.

const enc = new TextEncoder();
const PBKDF2_ITERATIONS = 100000; // Cloudflare Workers caps PBKDF2 at 100k
const SESSION_DAYS = 30;
const COOKIE = 'session';
const WINDOW_MS = 15 * 60 * 1000;

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const b64u = {
  enc(buf) {
    let s = '';
    new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function fail(status, message) {
  return json({ error: message }, status);
}

export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64u.dec(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return { hash: b64u.enc(bits), salt: b64u.enc(salt) };
}

export function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u.enc(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

function requireSecret(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short');
  }
  return env.SESSION_SECRET;
}

function secureFlag(request) {
  return new URL(request.url).protocol === 'https:' ? '; Secure' : '';
}

export async function makeSessionCookie(env, request, userId) {
  const payload = b64u.enc(enc.encode(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 864e5 })));
  const sig = await hmac(requireSecret(env), payload);
  return `${COOKIE}=${payload}.${sig}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secureFlag(request)}`;
}

export function clearSessionCookie(request) {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureFlag(request)}`;
}

export async function getUserId(env, request) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const expected = await hmac(requireSecret(env), payload);
  if (!safeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64u.dec(payload)));
    if (!data.uid || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

// Reject cross-site POSTs and non-JSON bodies. Returns a Response on failure, else null.
export function guardPost(request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return fail(403, 'Yêu cầu không hợp lệ.');
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) return fail(415, 'Cần gửi JSON.');
  return null;
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

export async function tooManyAttempts(env, key, limit) {
  const row = await env.DB.prepare('SELECT count, window_start FROM attempts WHERE key = ?').bind(key).first();
  if (!row) return false;
  if (Date.now() - row.window_start > WINDOW_MS) return false;
  return row.count >= limit;
}

export async function recordAttempt(env, key) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO attempts (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ?2 - window_start > ${WINDOW_MS} THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ?2 - window_start > ${WINDOW_MS} THEN ?2 ELSE window_start END`
  )
    .bind(key, now)
    .run();
}

export async function clearAttempts(env, key) {
  await env.DB.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run();
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || 'local';
}
