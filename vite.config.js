import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = 'http://127.0.0.1:8788';

// `npm run dev` runs this next to `wrangler pages dev` (port 8788), which serves the
// Hono API from functions/. Proxying /api keeps cookies same-origin in development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // Keep the browser's Host header (changeOrigin: false, unlike the string shorthand) so the
    // API's Origin-vs-Host CSRF check still sees matching values.
    proxy: { '/api': { target: API, changeOrigin: false } },
  },
});
