import { clearSessionCookie, guardPost, json } from '../_lib/auth.js';

export async function onRequestPost({ request }) {
  const bad = guardPost(request);
  if (bad) return bad;
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
}
