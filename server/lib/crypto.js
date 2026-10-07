// WebCrypto helpers: base64url, PBKDF2 password hashing, HMAC, constant-time compare.

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITERATIONS = 100000; // Cloudflare Workers caps PBKDF2 at 100k

export const b64u = {
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

export async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u.enc(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

export const encodeText = (s) => enc.encode(s);
export const decodeBytes = (b) => dec.decode(b);
