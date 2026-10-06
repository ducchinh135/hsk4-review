// Integration tests. Start the dev server first (npm run dev), then: npm test
// Reads INVITE_CODE from .dev.vars, or from the INVITE env var. BASE selects the server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const INVITE = process.env.INVITE || (readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').match(/^INVITE_CODE=(.*)$/m) || [])[1];
const uname = () => 't' + Math.random().toString(36).slice(2, 10);

async function call(method, path, { body, cookie, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, data: await res.json().catch(() => null), cookie: setCookie ? setCookie.split(';')[0] : null, raw: setCookie };
}

async function newUser() {
  const username = uname();
  const r = await call('POST', '/api/register', { body: { username, password: 'password123', invite: INVITE } });
  assert.equal(r.status, 201);
  return { username, cookie: r.cookie, setCookie: r.raw };
}

test('register: rejects bad invite, bad username, short password', async () => {
  assert.equal((await call('POST', '/api/register', { body: { username: uname(), password: 'password123', invite: 'nope' } })).status, 403);
  assert.equal((await call('POST', '/api/register', { body: { username: 'a b', password: 'password123', invite: INVITE } })).status, 400);
  assert.equal((await call('POST', '/api/register', { body: { username: uname(), password: 'short', invite: INVITE } })).status, 400);
});

test('register sets an HttpOnly session cookie; /me reflects it; duplicates rejected', async () => {
  const u = await newUser();
  assert.match(u.setCookie, /HttpOnly/);
  assert.match(u.setCookie, /SameSite=Lax/);
  assert.equal((await call('GET', '/api/me', { cookie: u.cookie })).data.user.username, u.username);
  assert.equal((await call('GET', '/api/me')).data.user, null);
  const dup = await call('POST', '/api/register', { body: { username: u.username.toUpperCase(), password: 'password123', invite: INVITE } });
  assert.equal(dup.status, 409);
});

test('login: right password works, wrong password and unknown user get the same 401', async () => {
  const u = await newUser();
  assert.equal((await call('POST', '/api/login', { body: { username: u.username, password: 'password123' } })).status, 200);
  const wrong = await call('POST', '/api/login', { body: { username: u.username, password: 'wrongpass1' } });
  const ghost = await call('POST', '/api/login', { body: { username: 'ghost' + uname(), password: 'wrongpass1' } });
  assert.equal(wrong.status, 401);
  assert.equal(ghost.status, 401);
  assert.equal(wrong.data.error, ghost.data.error);
});

test('login is throttled after repeated failures', async () => {
  const u = await newUser();
  let last;
  for (let i = 0; i < 9; i++) last = await call('POST', '/api/login', { body: { username: u.username, password: 'badbadbad' + i } });
  assert.equal(last.status, 429);
  // even the correct password is blocked during the lockout window
  assert.equal((await call('POST', '/api/login', { body: { username: u.username, password: 'password123' } })).status, 429);
});

test('tampered or forged session cookie is rejected', async () => {
  const u = await newUser();
  const forged = u.cookie.slice(0, -3) + 'abc';
  assert.equal((await call('GET', '/api/me', { cookie: forged })).data.user, null);
  assert.equal((await call('POST', '/api/sync', { cookie: forged, body: { marks: {} } })).status, 401);
});

test('sync requires login and rejects cross-site / non-JSON / invalid payloads', async () => {
  assert.equal((await call('POST', '/api/sync', { body: { marks: {} } })).status, 401);
  const u = await newUser();
  const evil = await call('POST', '/api/sync', { cookie: u.cookie, body: { marks: {} }, headers: { origin: 'https://evil.example' } });
  assert.equal(evil.status, 403);
  const res = await fetch(BASE + '/api/sync', { method: 'POST', headers: { cookie: u.cookie, 'content-type': 'text/plain' }, body: '{}' });
  assert.equal(res.status, 415);
  assert.equal((await call('POST', '/api/sync', { cookie: u.cookie, body: { marks: { 好: { s: 'x', t: 1 } } } })).status, 400);
  assert.equal((await call('POST', '/api/sync', { cookie: u.cookie, body: { marks: { 好: { s: 'k', t: 'now' } } } })).status, 400);
  assert.equal((await call('POST', '/api/sync', { cookie: u.cookie, body: { marks: { 好: { s: 'k', t: Date.now() + 9e9 } } } })).status, 400);
});

test('sync merges last-write-wins per word and is shared across devices', async () => {
  const u = await newUser();
  // device A
  const a = await call('POST', '/api/sync', { cookie: u.cookie, body: { marks: { 好: { s: 'k', t: 1000 }, 你: { s: 'r', t: 1000 } } } });
  assert.deepEqual(a.data.marks['好'], { s: 'k', t: 1000 });
  // device B logs in separately, sends an older edit for 好 and a newer one for 你
  const loginB = await call('POST', '/api/login', { body: { username: u.username, password: 'password123' } });
  const b = await call('POST', '/api/sync', { cookie: loginB.cookie, body: { marks: { 好: { s: 'r', t: 500 }, 你: { s: '', t: 2000 }, 他: { s: 'k', t: 1500 } } } });
  assert.deepEqual(b.data.marks['好'], { s: 'k', t: 1000 }, 'older edit must not overwrite');
  assert.deepEqual(b.data.marks['你'], { s: '', t: 2000 }, 'newer clear wins');
  assert.deepEqual(b.data.marks['他'], { s: 'k', t: 1500 });
  // device A pulls everything with an empty payload
  const pull = await call('POST', '/api/sync', { cookie: u.cookie, body: { marks: {} } });
  assert.equal(Object.keys(pull.data.marks).length, 3);
});

test("one user's progress is not visible to another user", async () => {
  const u1 = await newUser();
  const u2 = await newUser();
  await call('POST', '/api/sync', { cookie: u1.cookie, body: { marks: { 秘密: { s: 'k', t: 1000 } } } });
  const r = await call('POST', '/api/sync', { cookie: u2.cookie, body: { marks: {} } });
  assert.deepEqual(r.data.marks, {});
});

test('logout clears the cookie', async () => {
  const u = await newUser();
  const r = await call('POST', '/api/logout', { cookie: u.cookie, body: {} });
  assert.equal(r.status, 200);
  assert.match(r.raw, /Max-Age=0/);
});
