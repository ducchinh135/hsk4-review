# HSK4 vocabulary review

A vocabulary list, flashcard review (in order or
shuffled) and five practice exercises (hanzi → meaning, meaning → hanzi, listening, typing pinyin,
fill-in-the-blank) for HSK4 (lessons 1-20), with pronunciation (Web Speech API) and per-word
"known / needs review" marks.

A grammar section follows the textbook lesson by lesson: each grammar point has a pattern, an
explanation in Vietnamese, examples with pronunciation and common mistakes, plus fill-in-the-blank and
sentence-ordering exercises. Wrong answers mark the point "needs review" (synced like word marks).

- Without a backend (e.g. GitHub Pages) marks and review progress are stored in the browser only.
- With the Cloudflare backend, users sign in (username + password, invite code to register) and
  their marks sync across devices (last write wins per word).

## Pages

| Path | Page |
|---|---|
| `/words` | Vocabulary list of the chosen lesson: pinyin, meaning, example sentence, marks |
| `/review` | Flip through the lesson's cards in order or shuffled |
| `/practice` | Pick an exercise type; `/practice/meaning`, `/hanzi`, `/listen`, `/pinyin`, `/fill` run one |
| `/grammar` | Grammar points of the chosen lesson, filtered by mark; `/grammar#1.3` opens and scrolls to a point |
| `/grammar/practice` | A practice run over the chosen lesson's points (under the grammar filter) |
| `/grammar/review` | A practice run over every "needs review" grammar point (at most 30 questions) |

Paths are real URLs (History API), so the host must serve `index.html` for them. Cloudflare Pages does
that when `dist/` has no `404.html`; `/api/*` still goes to the Functions.

## Layout

| Path | What |
|---|---|
| `index.html`, `src/` | Vite + React frontend (`App.jsx`, `pages/`, `components/`, `hooks/`, `styles.css`) |
| `src/routes.js`, `src/router.jsx` | URL → page matching (pure, unit-tested) and the History API router (`useRoute`, `Link`) |
| `src/context/AppContext.jsx` | `AppProvider` / `useApp()`: marks, speech, account sync, chosen lesson and filter |
| `src/quiz.js` | Quiz question building, pinyin normalisation and checking |
| `src/grammar.js` | Grammar data access, filters, practice-run building, sentence-order checking, data validation |
| `src/data/grammar.json` | Grammar points per lesson (see below) |
| `src/data/vocab.json` | The vocabulary, one array per word: `[hanzi, pinyin, meaning, example zh, example vi]` |
| `src/data/practice.json` | Expanded HSK 4 textbook/workbook collocations (`phrases`) and context sentences (`sentences`) per word |
| `server/app.js` | The Hono API: middleware (no-store, CSRF guard) and routes |
| `server/routes/` | `auth.js` (`me`, `register`, `login`, `logout`) and `sync.js` |
| `server/lib/` | PBKDF2 hashing + HMAC (`crypto.js`), signed session cookie (`session.js`), login throttling (`throttle.js`) |
| `functions/api/[[route]].js` | Mounts the Hono app on Cloudflare Pages Functions |
| `migrations/` | D1 schema: `0001_init.sql` (`users`, `progress`, `attempts`), `0002_srs.sql` (`srs`, no longer used by the frontend) |
| `tests/api.test.mjs` | Integration tests for the API |
| `tests/quiz.test.mjs`, `tests/router.test.mjs`, `tests/grammar.test.mjs` | Unit tests for the quiz, URL matching, grammar logic and grammar data (no server needed) |

### Grammar data

`src/data/grammar.json` maps a lesson key (`L1`…`L20`, as in `vocab.json`) to its 5 grammar points in
textbook order. Lessons not written yet have no key, and their pages say the content is coming.

```json
{
  "id": "1.1",
  "title": "不仅……也/还/而且……",
  "pattern": "不仅 + A，也/还/而且 + B",
  "meaning": "…",
  "notes": ["…"],
  "examples": [["中文。", "pīnyīn", "Nghĩa tiếng Việt."]],
  "questions": [
    { "type": "choice", "q": "…___…", "options": ["4 khác nhau"], "answer": "…", "explain": "…" },
    { "type": "order", "parts": ["các cụm", "theo đúng thứ tự"], "answer": "…。", "alt": [], "vi": "…" }
  ]
}
```

Point marks are stored with the word marks under the key `g:<id>`. `npm run test:unit` validates the
whole file (5 points per lesson, ≥ 3 examples, ≥ 6 questions with both types, one `___` per choice
question, parts that join into the answer).

`server/` has no Pages-specific code. When the API outgrows Pages Functions, export `app.fetch`
from a Worker entry and point `/api/*` at it; the frontend does not change.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars      # then edit SESSION_SECRET and INVITE_CODE
npm run db:local                    # create the local D1 tables
npm run dev                         # app at http://localhost:5173 (Vite), API at :8788 (wrangler)
npm test                            # in another terminal, with `npm run dev` running
npm run test:unit                   # quiz + router unit tests, no server needed
```

`npm run dev` starts Vite (hot reload) and `wrangler pages dev` together; Vite proxies `/api` to
wrangler so cookies stay same-origin. `npm run preview` builds and serves the production bundle
plus the API from wrangler alone.

## Deploy to Cloudflare

1. Create a free account at https://dash.cloudflare.com and log in from the terminal:
   `npx wrangler login`
2. Create the database and paste the printed `database_id` into `wrangler.toml`:
   `npx wrangler d1 create hsk4`
3. Create the tables on the remote database (run this again after pulling new migrations, *before*
   deploying code that uses them):
   `npx wrangler d1 migrations apply hsk4 --remote`
4. Create the Pages project and deploy:
   `npx wrangler pages project create hsk4-review --production-branch main`
   `npm run deploy` (builds with Vite into `dist/`, then uploads it with the functions)
5. Set the two secrets (Pages project > Settings > Variables and Secrets, or via the CLI):
   `npx wrangler pages secret put SESSION_SECRET --project-name hsk4-review` (a long random string,
   e.g. `openssl rand -hex 32`) and
   `npx wrangler pages secret put INVITE_CODE --project-name hsk4-review` (the code you give friends).
6. Redeploy once (`npm run deploy`) so the secrets take effect.

Registration is closed unless `INVITE_CODE` is set.
