# HSK4 vocabulary review

A vocabulary list, flashcard review (in order or
shuffled) and five practice exercises (hanzi → meaning, meaning → hanzi, listening, typing pinyin,
fill-in-the-blank) for HSK4 (lessons 1-20), with pronunciation (Web Speech API) and per-word
"known / needs review" marks.

A grammar section follows the textbook lesson by lesson: each grammar point has a pattern, an
explanation in Vietnamese, examples with pronunciation and common mistakes, plus fill-in-the-blank and
sentence-ordering exercises. Wrong answers mark the point "needs review" (synced like word marks).

A confusable-words section compares the 125 groups of near-synonyms of a reference book, grouped by
the initial letter of their pinyin (e.g. 刚 / 刚才, 认为 / 以为, 别 / 别的 / 另 / 另外): what they
share, a comparison table, examples per word with pronunciation and a tip, plus a search over every
group (hanzi or toneless pinyin) and fill-in-the-blank exercises whose choices are the words of the
group. Wrong answers mark the group "needs review".

A listening section practises the listening part of the HSK 4 exam one part at a time (parts I,
判断对错, and II, 选择正确答案, are done; part III is a dimmed tab): a tips page, question types, a
mixed run and a review of the questions marked "needs review" for each part. Each question plays a
pre-made mp3. Part I: a passage, then the ★ statement, and you pick 对 or 错. Part II: a two-line
dialogue between a man and a woman, then a spoken question (shown as text only on request), and you
pick one of four printed answers A–D. The answer shows the transcript with pinyin, a Vietnamese
translation and an explanation. Wrong answers mark the question "needs review".

A reading section practises the reading part of the HSK 4 exam one part at a time: I, 选词填空; II,
排列顺序; III, 阅读理解. Part I works in sets as in the exam: six words A–F, one of
them already used by the 例如 example, and five blanks (single sentences, or two-line A/B dialogues).
Pick a blank, then a word (or type A–F, 1–5, Backspace); once the five blanks are filled, submit the
set to see each sentence in full with pinyin, a Vietnamese translation and an explanation. A set
with a wrong blank is marked "needs review" as a whole.
Part II gives three sentences A, B and C to put in order (tap or type A–C, Backspace takes the last
one out); checking shows the joined paragraph with its clue words marked, pinyin, a translation and a
three-step explanation (which sentence opens, which follows, which closes). Part III shows a passage
(short with one question, or long with two) with a Pinyin switch; each answer is graded at once, the
words that decide it are marked in the passage, and the translation opens once every question is
answered. Wrong answers are marked "needs review" per question.

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
| `/compare` | Confusable-word groups of the chosen letter, filtered by mark, with a search over every group; `/compare#096` opens and scrolls to a group |
| `/compare/practice` | A practice run over the chosen letter's groups (under the compare filter) |
| `/compare/review` | A practice run over every "needs review" group (at most 30 questions) |
| `/listening/p1` | Part I hub: tips, the three question types, mixed run, review (`/listening` redirects here) |
| `/listening/p1/tips` | Tips for part I |
| `/listening/p1/practice/<type>` | A run over one type (`detail`, `attitude`, `infer`) or `mix` (10 questions across the types) |
| `/listening/p1/review` | A run over every "needs review" listening question (at most 30) |
| `/listening/p2`, `/listening/p2/tips`, `/listening/p2/review` (and `p3`) | The same pages for parts II and III |
| `/listening/p2/practice/<type>` | A run over one part II type (`detail`, `reason`, `attitude`, `infer`; part III: `dialogue`, `detail`, `gist`) or `mix` (15 questions) |
| `/reading/p1` | Reading part I hub: tips, the two set types, mixed run, review (`/reading` redirects here) |
| `/reading/p1/tips` | Tips for reading part I |
| `/reading/p1/practice/<type>` | A run over one type (`sentence`, `dialogue`) or `mix` (one set of each, 10 blanks) |
| `/reading/p1/review` | A run over every "needs review" set (at most 6) |
| `/reading/p2`, `/reading/p2/tips`, `/reading/p2/review` | The same pages for reading part II (review: at most 30 questions) |
| `/reading/p2/practice/<type>` | A run over one part II type (`pair`, `ref`, `time`, `topic`) or `mix` (10 questions across the types) |
| `/reading/p3`, `/reading/p3/tips`, `/reading/p3/review` | The same pages for reading part III (review: at most 20 passages, each with only its questions marked "needs review") |
| `/reading/p3/practice/<type>` | A run over one part III type (`detail`, `gist`, `infer`, `word`, `long`) or `mix` (14 short passages and 3 long ones, 20 questions) |

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
| `src/compare.js` | Confusable-word data access, filters, search, practice-run building, data validation |
| `src/data/compare.json` | The confusable-word groups, as one flat list (see below) |
| `src/listening.js` | Listening data access, run building, remembered speed and pinyin choices, data validation |
| `src/data/listening.json` | The listening parts: tips, question types and questions (see below) |
| `src/reading.js` | Reading data access, run building, filling and grading a set, keys, data validation |
| `src/data/reading.json` | The reading parts: tips, types and sets (see below) |
| `public/audio/listening/` | One mp3 per question (`p1-001.mp3`…) and `manifest.json`, made by `scripts/tts.py` |
| `public/audio/tips/` | One mp3 per example on the listening (`l-…`) and reading (`r-…`) tips pages, named `<l|r>-<part>-<section>-<example>.mp3`, made by `scripts/tts.py` |
| `scripts/tts.py` | Makes the listening audio with `edge-tts` (see below) |
| `src/data/vocab.json` | The vocabulary, one array per word: `[hanzi, pinyin, meaning, example zh, example vi]` |
| `src/data/practice.json` | Expanded HSK 4 textbook/workbook collocations (`phrases`) and context sentences (`sentences`) per word |
| `server/app.js` | The Hono API: middleware (no-store, CSRF guard) and routes |
| `server/routes/` | `auth.js` (`me`, `register`, `login`, `logout`) and `sync.js` |
| `server/lib/` | PBKDF2 hashing + HMAC (`crypto.js`), signed session cookie (`session.js`), login throttling (`throttle.js`) |
| `functions/api/[[route]].js` | Mounts the Hono app on Cloudflare Pages Functions |
| `migrations/` | D1 schema: `0001_init.sql` (`users`, `progress`, `attempts`), `0002_srs.sql` (`srs`, no longer used by the frontend) |
| `tests/api.test.mjs` | Integration tests for the API |
| `tests/quiz.test.mjs`, `tests/router.test.mjs`, `tests/grammar.test.mjs`, `tests/compare.test.mjs`, `tests/listening.test.mjs`, `tests/reading.test.mjs`, `tests/voice.test.mjs` | Unit tests for the quiz, URL matching, grammar, confusable-words, listening and reading logic and data, and the choice of the browser voice (no server needed) |

### Listening data and audio

`src/data/listening.json` has `parts` (I, II and III), each with a `format` (`truefalse` or `choice`),
`tips`, `types` and `questions`; a part may set `mixCount` (size of its mixed run, default 10). Every
question has a fixed `id` (`p1-001`, `p2-001`; it is the audio file name and the mark key `l:p2-001`, so
never renumber a published question), a `type` and an `explain`. A `truefalse` question (part I) has
`voice` (`f`/`m`, the passage voice; the ★ statement uses the other), the passage `text`/`pinyin`/`vi`, the
`statement`/`statementPinyin`/`statementVi` and `answer` (`true` = 对). A `choice` question (part II and III) has
`lines` (exactly two in part II; a part may set `minLines`/`maxLines`, part III allows 1–6: a 4-turn dialogue or a one-voice passage) (`{v, text, pinyin, vi}`), the spoken `question` (same fields),
four `options` (`{text, pinyin, vi}`) and `answer` (0–3 = A–D). `npm run test:unit` validates the data
(per format) and checks every question has its mp3.

After adding or changing questions, make the audio (needs Python 3 and a network connection; the
voices are the online neural voices of `edge-tts`, an unofficial use of Edge's read-aloud service, so it
may stop working; existing mp3 files are unaffected):

```sh
python3 -m venv .venv && .venv/bin/pip install edge-tts   # once; .venv is not committed
.venv/bin/python scripts/tts.py --dry-run   # what would be made (no network, nothing written)
.venv/bin/python scripts/tts.py             # only new or changed questions
.venv/bin/python scripts/tts.py --force --rate=-10%   # redo everything, slower (default -5%)
```

The same run makes the tips examples (`public/audio/tips/`, from both `listening.json` and `reading.json`): `A：`/`B：` lines are read in two voices, and option letters, ★, blanks and slashes become short pauses. The tips pages play these files and fall back to the browser's voice only when a file is missing, so after editing a tips example, run the script again. Each part I mp3 is the passage, 1.5 s of silence, then the statement; each part II mp3 is the two dialogue lines 1 s apart, 2 s of silence, then the question. The voices are Xiaoxiao (woman) and Yunyang (man, about 133 Hz against her 255 Hz; `--male-voice=zh-CN-YunjianNeural` is deeper still); changing a voice or a pause remakes the files. The pieces are joined by concatenating
the mp3 bytes (all are MPEG-2 layer III, 24 kHz), which plays and decodes in Chrome; if a browser ever
glitches at the join, rebuild the file with `ffmpeg`.

### Reading data

`src/data/reading.json` has `parts` (I, II and III), each with a `format` (`fill`, `order` or `read`),
`tips` and `types`; a part may set `mixCount` (size of its mixed run, default 10; a `fill` mix is one
set of each type). A `fill` part has `sets`; every set has a fixed `id` (`p1-001`; it is the mark key `r:p1-001`,
so never renumber a published set), a `type` (`sentence` or `dialogue`), six `words` (`{text, pinyin,
vi}`, shown as A–F in this order), an `example` (`{text, answer}`, text with one `___`) and five
`items` (`{text, pinyin, vi, answer, explain}`). `answer` is the index of a word (0–5); the example
and the five items use the six words once each. A dialogue item's `text`, `pinyin` and `vi` are two
lines (`A：…\nB：…`). An `order` part has `questions`: a fixed `id` (`p2-001`, mark key `r:p2-001`),
a `type`, three `sentences` (`{text, pinyin, vi}`, shown as A–C in this order, each with its own
punctuation), `answer` (an order of A, B, C other than `ABC`, e.g. `BCA`), `clues` (words marked in
the joined paragraph; each must appear in a sentence) and `explain` (`{first, next, last}`).
A `read` part has `passages`: a fixed `id` (`p3-001`), a `type`, the passage `text`/`pinyin`/`vi` and
`questions` (one; two for `long`), each with `text`/`pinyin`/`vi`, four `options` (`{text, pinyin, vi}`),
`answer` (0–3), `evidence` (passage substrings marked once the question is answered) and `explain`. A
question's mark key is `r:p3-001.1` (its number in the passage). `npm run test:unit` validates the file.

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

### Confusable-words data

`src/data/compare.json` is one flat list of groups in id order (`001` … `125`, the numbers of the
book's table of contents; written in batches, so the list may stop before 125). `letter` is the
initial of the pinyin as in the table of contents (the ranges live in `src/compare.js`).

```json
{
  "id": "096",
  "letter": "R",
  "words": [["认为", "rènwéi"], ["以为", "yǐwéi"]],
  "common": "…",
  "rows": [["Tiêu chí", "ô cho 认为", "ô cho 以为"]],
  "examples": [["中文。", "pīnyīn", "Nghĩa.", 0]],
  "tip": "…",
  "questions": [{ "q": "…___…", "answer": "以为", "explain": "…" }]
}
```

The last item of an example is the index of the word it shows. The choices of a question are the
group's words. Group marks are stored under `c:<id>`. `npm run test:unit` validates the file (2-5
words, ≥ 2 rows, ≥ 2 examples per word containing it, max(4, words) to 8 questions with one `___`,
every word an answer at least once, words equal to the book's index).

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
