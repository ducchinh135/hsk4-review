import { getUserId, json } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const uid = await getUserId(env, request);
  if (!uid) return json({ user: null });
  const user = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(uid).first();
  return json({ user: user ? { username: user.username } : null });
}
