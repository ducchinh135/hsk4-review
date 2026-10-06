# HSK4 vocabulary review

Flashcards, shuffled review and fill-in-the-blank for HSK4 (lessons 1-10), with pronunciation
(Web Speech API) and per-word "known / needs review" marks.

- Without a backend (e.g. GitHub Pages) marks are stored in the browser only.
- With the Cloudflare backend, users sign in (username + password, invite code to register) and
  their marks sync across devices (last write wins per word).

## Layout

| Path | What |
|---|---|
| `public/index.html` | The whole frontend (vocabulary is embedded) |
| `functions/api/*.js` | Pages Functions: `register`, `login`, `logout`, `me`, `sync` |
| `functions/_lib/auth.js` | PBKDF2 password hashing, signed session cookie, CSRF guard, login throttling |
| `migrations/0001_init.sql` | D1 schema (`users`, `progress`, `attempts`) |
| `tests/api.test.mjs` | Integration tests for the API |

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars      # then edit SESSION_SECRET and INVITE_CODE
npm run db:local                    # create the local D1 tables
npm run dev                         # http://localhost:8788
npm test                            # in another terminal, with the dev server running
```

## Deploy to Cloudflare

1. Create a free account at https://dash.cloudflare.com and log in from the terminal:
   `npx wrangler login`
2. Create the database and paste the printed `database_id` into `wrangler.toml`:
   `npx wrangler d1 create hsk4`
3. Create the tables on the remote database:
   `npx wrangler d1 migrations apply hsk4 --remote`
4. Create the Pages project and deploy:
   `npx wrangler pages project create hsk4-review --production-branch main`
   `npm run deploy`
5. Set the two secrets (Pages project > Settings > Variables and Secrets, or via the CLI):
   `npx wrangler pages secret put SESSION_SECRET --project-name hsk4-review` (a long random string,
   e.g. `openssl rand -hex 32`) and
   `npx wrangler pages secret put INVITE_CODE --project-name hsk4-review` (the code you give friends).
6. Redeploy once (`npm run deploy`) so the secrets take effect.

Registration is closed unless `INVITE_CODE` is set.
