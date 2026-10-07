// Signed, HttpOnly session cookie: `<base64url(payload)>.<hmac>`.
import { b64u, decodeBytes, encodeText, hmac, safeEqual } from './crypto.js';

const SESSION_DAYS = 30;
const COOKIE = 'session';

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
  const payload = b64u.enc(encodeText(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 864e5 })));
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
    const data = JSON.parse(decodeBytes(b64u.dec(payload)));
    if (!data.uid || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}
