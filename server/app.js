// The whole API. Runtime-agnostic Hono app: mounted by functions/api/[[route]].js
// on Pages today, and could be exported as a standalone Worker later.
import { Hono } from 'hono';
import { guardPost, noStore } from './middleware.js';
import auth from './routes/auth.js';
import sync from './routes/sync.js';

const app = new Hono().basePath('/api');

app.use('*', noStore);
app.use('*', guardPost);
app.route('/', auth);
app.route('/', sync);

app.notFound((c) => c.json({ error: 'Không tìm thấy.' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Lỗi máy chủ.' }, 500);
});

export default app;
