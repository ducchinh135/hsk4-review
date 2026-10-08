# Tách web thành các trang riêng — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến web một-trang-nhiều-tab thành 4 trang có địa chỉ riêng (`/daily`, `/words`, `/review`, `/practice`), trong đó Thực hành chia thành 5 dạng bài chạy ngay không cần tuỳ chọn.

**Architecture:** Router History API tự viết (phần khớp đường dẫn là hàm thuần để test bằng Node). State dùng chung (marks, srs, speech, account, bài đang chọn, bộ lọc) nằm trong `AppProvider`; mỗi trang đọc qua `useApp()` và tự dựng các thanh điều khiển nó cần. Logic SRS, quiz, hook và backend giữ nguyên.

**Tech Stack:** React 19, Vite 8, `node --test` (test đơn vị), Cloudflare Pages + Hono (không đổi).

**Spec:** [docs/superpowers/specs/2026-10-08-page-split-design.md](../specs/2026-10-08-page-split-design.md)

## Global Constraints

- Không thêm thư viện (router, test UI, v.v.); dependencies trong `package.json` giữ nguyên.
- Đường dẫn sạch, không dùng hash: `/daily`, `/words`, `/review`, `/practice`, `/practice/:dạng`, với `:dạng` ∈ `meaning | hanzi | listen | pinyin | fill`.
- `/` và mọi đường dẫn không hợp lệ → `/daily` (dùng `replaceState`); `/practice/<dạng lạ>` → `/practice`.
- Mỗi lượt Thực hành: tối đa **20** câu (`PRACTICE_COUNT = 20`), chỉ một dạng; gõ pinyin **bắt buộc đúng dấu thanh**.
- Quiz sai: đặt dấu `r` nếu chưa có và gọi `srs.lapse(hanzi)` (giữ nguyên hành vi hiện tại).
- Không sửa `src/srs.js`, `src/hooks/*`, `server/`, `functions/`, `migrations/`, `src/data/vocab.json`.
- Khóa localStorage mới: `hsk4_review_mode` (`'order' | 'shuffle'`). Giữ `hsk4_filter`. Bỏ qua `hsk4_quiz_settings` cũ.
- Mọi đọc/ghi localStorage bọc `try/catch` như code hiện có.
- Văn bản giao diện bằng tiếng Việt, giống phong cách hiện có.
- Chạy lệnh từ thư mục gốc repo `C:\chinh-dev\hsk` (Git Bash). Trước mỗi lần commit: `npm run test:unit` và `npm run build` phải pass.

## Review Focus

Các đầu vào/điều kiện mà spec ngầm hiểu nhưng task thường không test, dễ gây lỗi nhất:

1. Vào thẳng `/practice/fill` (hoặc `/practice/listen` khi trình duyệt không có Web Speech) khi tập từ không có từ phù hợp → hiện ghi chú + nút quay lại, không lỗi. *(Test: Task 5 `buildQuiz` trả `[]`; kiểm tra tay: Task 6.)*
2. URL kỳ quặc: `/index.html`, `//words`, `/words/`, `/Words`, `/practice/`, `/practice/pinyin/extra` → khớp đúng trang hoặc về `/daily`/`/practice`. *(Test: Task 1.)*
3. Vòng lặp lịch sử: mở `/` rồi bấm Back không được kẹt (chuyển hướng dùng `replaceState`). *(Kiểm tra tay: Task 2 và Task 7.)*
4. Bộ lọc không có từ nào (`fellBack`) ở `/practice` và `/words`: số từ trên thẻ và danh sách khớp nhau, có ghi chú. *(Kiểm tra tay: Task 4 và Task 6.)*
5. Đăng nhập thay thế dữ liệu local khi đang ở `/words`: danh sách dựng lại theo dữ liệu mới (cơ chế `viewVersion`). *(Kiểm tra tay: Task 7.)*
6. Đánh dấu một từ ở `/words` khi bộ lọc là "Chưa đánh dấu": dòng không biến mất ngay. *(Kiểm tra tay: Task 4.)*

---

## Cấu trúc file

| File | Việc | Hành động |
|---|---|---|
| `src/routes.js` | Hàm thuần `matchRoute`, danh sách `PAGES`, `PAGE_TITLES` | Tạo |
| `src/router.jsx` | `navigate`, `useRoute`, `<Link>` | Tạo |
| `src/context/AppContext.jsx` | `AppProvider`, `useApp()`: toàn bộ state dùng chung | Tạo |
| `src/components/NavBar.jsx` | Thanh 4 mục + badge | Tạo |
| `src/components/StudyBar.jsx` | Tab bài + tiêu đề bài + AudioBar + FilterBar (dùng ở Words, Review, Practice hub) | Tạo |
| `src/components/WordRow.jsx` | Một dòng trong danh sách từ | Tạo |
| `src/components/PracticeHub.jsx` | 5 thẻ dạng bài | Tạo |
| `src/pages/DailyPage.jsx`, `WordsPage.jsx`, `ReviewPage.jsx`, `ExercisePage.jsx` | Các trang | Tạo |
| `src/App.jsx` | `AppProvider` + `Shell` (chọn trang theo route) | Viết lại |
| `src/components/SrsPanel.jsx` | Bỏ prop `active` | Sửa |
| `src/components/FilterBar.jsx` | Xuất thêm `FILTER_LABELS` | Sửa |
| `src/quiz.js` | Thêm `PRACTICE_COUNT`, `countApplicable` | Sửa |
| `src/components/Study.jsx`, `QuizPanel.jsx` | Bị thay thế | Xóa |
| `src/styles.css` | Thêm style mới, bỏ `.mode-tab(s)` và `.panel.active` | Sửa |
| `tests/router.test.mjs`, `tests/quiz.test.mjs`, `package.json`, `README.md` | Test và tài liệu | Tạo/Sửa |

Ghi chú so với spec: spec ghi `router.js`; kế hoạch tách thành `routes.js` (thuần, test được bằng Node) và `router.jsx` (hook + Link). Spec ghi `PracticePage.jsx`; kế hoạch bỏ file này, `Shell` chọn thẳng `PracticeHub` / `ExercisePage`. `StudyBar` là thành phần mới để tránh lặp ba lần.

---

### Task 1: `matchRoute` (khớp đường dẫn) và test

**Files:**
- Create: `src/routes.js`
- Create: `tests/router.test.mjs`
- Modify: `package.json` (script `test:unit`)

**Interfaces:**
- Consumes: `QUIZ_TYPES` từ `src/quiz.js` (mảng `[type, label]`).
- Produces:
  - `matchRoute(pathname: string) => { page: 'daily'|'words'|'review'|'practice'|'exercise', params: { type?: string }, path: string }` (`path` là đường dẫn chuẩn).
  - `PAGES: Array<{ page, path, label }>` (4 mục điều hướng, theo thứ tự hiển thị).
  - `PAGE_TITLES: Record<page, string>`.

- [ ] **Step 1: Viết test (sẽ fail)**

Tạo `tests/router.test.mjs`:

```js
// Unit tests for URL -> page matching. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_TYPES } from '../src/quiz.js';
import { PAGES, matchRoute } from '../src/routes.js';

const page = (p) => ({ page: p, params: {}, path: '/' + p });

test('matchRoute() maps the four pages', () => {
  assert.deepEqual(matchRoute('/daily'), page('daily'));
  assert.deepEqual(matchRoute('/words'), page('words'));
  assert.deepEqual(matchRoute('/review'), page('review'));
  assert.deepEqual(matchRoute('/practice'), page('practice'));
});

test('matchRoute() sends the root and unknown paths to /daily', () => {
  for (const p of ['/', '', '/nope', '/index.html', '/Words', '/words/foo', '/daily/x', '/api/me']) {
    assert.deepEqual(matchRoute(p), { page: 'daily', params: {}, path: '/daily' }, p);
  }
});

test('matchRoute() ignores trailing and doubled slashes', () => {
  assert.deepEqual(matchRoute('/words/'), page('words'));
  assert.deepEqual(matchRoute('//words'), page('words'));
  assert.deepEqual(matchRoute('/practice/'), page('practice'));
});

test('matchRoute() resolves every exercise type', () => {
  for (const [type] of QUIZ_TYPES) {
    assert.deepEqual(matchRoute('/practice/' + type), { page: 'exercise', params: { type }, path: '/practice/' + type });
  }
});

test('matchRoute() sends an unknown or over-long practice path to /practice', () => {
  assert.deepEqual(matchRoute('/practice/xyz'), page('practice'));
  assert.deepEqual(matchRoute('/practice/pinyin/extra'), page('practice'));
  assert.deepEqual(matchRoute('/practice/Pinyin'), page('practice'));
});

test('PAGES lists the four navigation entries in order', () => {
  assert.deepEqual(
    PAGES.map((p) => p.path),
    ['/daily', '/words', '/review', '/practice']
  );
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `node --test tests/router.test.mjs`
Expected: FAIL (không import được `../src/routes.js`).

- [ ] **Step 3: Viết `src/routes.js`**

```js
// URL -> page mapping with no DOM or React, so Node tests can use it.
import { QUIZ_TYPES } from './quiz.js';

export const PAGES = [
  { page: 'daily', path: '/daily', label: '🧠 Ôn hằng ngày' },
  { page: 'words', path: '/words', label: '📚 Từ vựng' },
  { page: 'review', path: '/review', label: '📇 Ôn tập' },
  { page: 'practice', path: '/practice', label: '📝 Thực hành' },
];

export const PAGE_TITLES = {
  daily: 'Ôn hằng ngày',
  words: 'Từ vựng',
  review: 'Ôn tập',
  practice: 'Thực hành',
  exercise: 'Thực hành',
};

const EXERCISE_TYPES = QUIZ_TYPES.map(([t]) => t);
const SIMPLE = ['daily', 'words', 'review'];

// Returns the page to render and the canonical path for it (the router replaces the URL with
// `path` when they differ, so unknown URLs end up on a real page).
export function matchRoute(pathname) {
  const [a, b, ...rest] = String(pathname).split('/').filter(Boolean);
  if (a === 'practice') {
    if (b && !rest.length && EXERCISE_TYPES.includes(b)) return { page: 'exercise', params: { type: b }, path: `/practice/${b}` };
    return { page: 'practice', params: {}, path: '/practice' };
  }
  if (SIMPLE.includes(a) && !b) return { page: a, params: {}, path: '/' + a };
  return { page: 'daily', params: {}, path: '/daily' };
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `node --test tests/router.test.mjs`
Expected: PASS (6 test).

- [ ] **Step 5: Nối vào script `test:unit`**

Trong `package.json`, đổi:

```json
"test:unit": "node --test tests/srs.test.mjs tests/quiz.test.mjs",
```

thành:

```json
"test:unit": "node --test tests/srs.test.mjs tests/quiz.test.mjs tests/router.test.mjs",
```

Run: `npm run test:unit`
Expected: tất cả PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes.js tests/router.test.mjs package.json
git commit -m "Add route matching for the page split" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Router (hook + Link) và NavBar

**Files:**
- Create: `src/router.jsx`
- Create: `src/components/NavBar.jsx`
- Modify: `src/styles.css` (thêm cuối file)

**Interfaces:**
- Consumes: `matchRoute`, `PAGES` từ `src/routes.js`.
- Produces:
  - `navigate(to: string, opts?: { replace?: boolean }): void`
  - `useRoute(): { page, params, path }` (đồng thời tự `replaceState` về đường dẫn chuẩn)
  - `<Link to="/x" ...anchorProps>`: click thường điều hướng không tải lại trang; Ctrl/Cmd/Shift/Alt/giữa chuột, hoặc `target` được trình duyệt xử lý.
  - `<NavBar page={string} dueCount={number} />`: `page` là `route.page` (`exercise` cũng làm mục Thực hành sáng).

- [ ] **Step 1: Viết `src/router.jsx`**

```jsx
import { useEffect, useSyncExternalStore } from 'react';
import { matchRoute } from './routes.js';

const listeners = new Set();
const subscribe = (cb) => {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
};
const getPath = () => window.location.pathname;

export function navigate(to, { replace = false } = {}) {
  if (to !== window.location.pathname) {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', to);
    if (!replace) window.scrollTo(0, 0);
  }
  listeners.forEach((cb) => cb());
}

// The page for the current URL. Unknown URLs are replaced (not pushed) with a real page, so Back
// never lands on a redirecting URL.
export function useRoute() {
  const pathname = useSyncExternalStore(subscribe, getPath);
  const route = matchRoute(pathname);
  useEffect(() => {
    if (route.path !== pathname) navigate(route.path, { replace: true });
  }, [route.path, pathname]);
  return route;
}

export function Link({ to, onClick, target, ...props }) {
  const click = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || target) return;
    e.preventDefault();
    navigate(to);
  };
  return <a {...props} href={to} target={target} onClick={click} />;
}
```

- [ ] **Step 2: Viết `src/components/NavBar.jsx`**

```jsx
import { Link } from '../router.jsx';
import { PAGES } from '../routes.js';

// Main navigation. `page` is route.page; an exercise run still counts as the Practice section.
export default function NavBar({ page, dueCount }) {
  const current = page === 'exercise' ? 'practice' : page;
  return (
    <nav className="nav-tabs" aria-label="Điều hướng chính">
      {PAGES.map((p) => (
        <Link key={p.page} to={p.path} className={'nav-tab' + (p.page === current ? ' active' : '')} aria-current={p.page === current ? 'page' : undefined}>
          {p.label}
          {p.page === 'daily' && dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Thêm CSS cho NavBar (cuối `src/styles.css`)**

Các rule `.mode-tab(s)` cũ vẫn còn để app chạy tới hết Task 3; Task 7 sẽ xóa chúng.

```css

/* ---------- MAIN NAVIGATION ---------- */
.nav-tabs{
  max-width:900px; margin:0 auto 26px; display:flex; justify-content:center; gap:10px;
  background:#ffffffaa; border-radius:18px; padding:8px; flex-wrap:wrap;
}
.nav-tab{
  display:inline-flex; align-items:center; justify-content:center; gap:6px; text-decoration:none;
  padding:12px 20px; border-radius:14px; font-size:16px; font-weight:700; color:#555;
}
.nav-tab.active{ background:var(--accent,#333); color:#fff; }
.nav-badge{ background:#e03131; color:#fff; border-radius:999px; font-size:12px; font-weight:800; padding:2px 7px; min-width:20px; text-align:center; }
@media (max-width:600px){
  .nav-tabs{ margin:0 10px 18px; padding:6px; gap:4px; border-radius:16px; }
  .nav-tab{ flex:1 1 0; min-width:0; padding:10px 4px; font-size:13px; line-height:1.3; flex-direction:column; gap:2px; }
}
```

- [ ] **Step 4: Build để bắt lỗi cú pháp**

Run: `npm run build`
Expected: build thành công (các file mới chưa được dùng nhưng vẫn phải biên dịch khi được import ở Task 3; bước này chỉ chắc app cũ không hỏng).

- [ ] **Step 5: Commit**

```bash
git add src/router.jsx src/components/NavBar.jsx src/styles.css
git commit -m "Add History API router and main nav bar" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: AppProvider, Shell và các trang bọc panel hiện có

Sau task này app chạy trên route thật với 4 trang; `/words` tạm chỉ có thanh điều khiển (Task 4 làm danh sách), `/practice` tạm giữ quiz cũ (Task 6 thay).

**Files:**
- Create: `src/context/AppContext.jsx`, `src/components/StudyBar.jsx`
- Create: `src/pages/DailyPage.jsx`, `src/pages/ReviewPage.jsx`, `src/pages/PracticePage.jsx` (tạm), `src/pages/WordsPage.jsx` (tạm)
- Modify: `src/App.jsx` (viết lại), `src/components/SrsPanel.jsx`, `src/components/CardsPanel.jsx`, `src/components/ReviewPanel.jsx`, `src/components/QuizPanel.jsx`, `src/styles.css`
- Delete: `src/components/Study.jsx`

**Interfaces:**
- Consumes: `useRoute`, `Link` (Task 2); `NavBar` (Task 2); `PAGE_TITLES` (Task 1); các hook và component hiện có.
- Produces:
  - `useApp()` trả `{ marks, srs, speech, account, lesson, selectLesson(l), filter, applyFilter(f), resetMarks(), viewVersion, words, fellBack, lessonWords, counts, srsCounts }`:
    - `words`: từ của bài đã lọc (rơi về cả bài nếu lọc rỗng, `fellBack = true`);
    - `lessonWords`: toàn bộ từ của bài; `counts = { n, k, r, fresh }`;
    - `srsCounts` từ `queueCounts(...)` (`due`, `learning`, `fresh`, `tomorrow`).
  - `<StudyBar />`: tab bài, tiêu đề bài, thanh âm thanh, bộ lọc (đọc state từ `useApp()`).

- [ ] **Step 1: Tạo `src/context/AppContext.jsx`**

Chuyển nguyên logic từ `App.jsx` cũ (giữ nguyên các comment giải thích):

```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from '../hooks/useAccount.js';
import { useMarks } from '../hooks/useMarks.js';
import { useSpeech } from '../hooks/useSpeech.js';
import { useSrs } from '../hooks/useSrs.js';
import { ALL_HANZI, LESSON_COLORS, LESSON_ORDER, VOCAB } from '../lessons.js';
import { queueCounts, today } from '../srs.js';

const FILTER_KEY = 'hsk4_filter';
const FILTERS = ['all', 'new', 'r', 'k'];

function loadFilter() {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return FILTERS.includes(f) ? f : 'all';
  } catch {
    return 'all';
  }
}

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

// State shared by every page: progress hooks, account sync, the chosen lesson and filter.
export function AppProvider({ children }) {
  const [lesson, setLesson] = useState(LESSON_ORDER[0]);
  const [filter, setFilter] = useState(loadFilter);
  // Bumped whenever page views must be rebuilt (lesson/filter picked, marks replaced).
  // Marking a word does NOT bump it, so a card or row stays put after you mark it.
  const [viewVersion, setViewVersion] = useState(0);
  const refreshView = useCallback(() => setViewVersion((v) => v + 1), []);

  const syncRef = useRef(() => {});
  const marks = useMarks(() => syncRef.current());
  const srs = useSrs(() => syncRef.current());
  const speech = useSpeech();
  const account = useAccount({
    getMarks: marks.getAll,
    mergeServer: marks.mergeServer,
    clearMarks: marks.clearAll,
    getSrs: srs.getAll,
    mergeSrs: srs.mergeServer,
    clearSrs: srs.clearAll,
    onReplaced: refreshView,
  });
  syncRef.current = account.scheduleSync;

  const lessonWords = VOCAB[lesson].words;
  const { words, fellBack } = useMemo(() => {
    const m = marks.markRef.current;
    const mark = (w) => (m[w[0]] && m[w[0]].s) || '';
    const list = lessonWords.filter((w) => filter === 'all' || (filter === 'new' && mark(w) === '') || mark(w) === filter);
    return list.length ? { words: list, fellBack: false } : { words: lessonWords, fellBack: true };
    // marks are read on purpose only when the view is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonWords, filter, viewVersion]);

  const counts = useMemo(() => {
    let k = 0;
    let r = 0;
    lessonWords.forEach((w) => {
      const m = marks.getMark(w[0]);
      if (m === 'k') k++;
      else if (m === 'r') r++;
    });
    return { n: lessonWords.length, k, r, fresh: lessonWords.length - k - r };
  }, [lessonWords, marks.getMark]);

  // The study day changes at 4am; a tab left open overnight must notice.
  const [day, setDay] = useState(today);
  useEffect(() => {
    const tick = () => setDay(today());
    const onVisible = () => !document.hidden && tick();
    const id = setInterval(tick, 60_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  // Recomputed whenever a card changes or the day rolls over, so the counts stay current.
  const srsCounts = useMemo(() => queueCounts(srs.srs, ALL_HANZI, day, srs.newPerDay), [srs.srs, srs.newPerDay, day]);

  const color = LESSON_COLORS[lesson];
  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty('--accent-a', color.a);
    s.setProperty('--accent-b', color.b);
    s.setProperty('--accent-bg', color.bg);
    s.setProperty('--accent', color.a);
  }, [color]);

  const selectLesson = (l) => {
    speech.cancel();
    setLesson(l);
    refreshView();
  };
  const applyFilter = (f) => {
    setFilter(f);
    try {
      localStorage.setItem(FILTER_KEY, f);
    } catch {
      /* ignore */
    }
    refreshView();
  };
  const resetMarks = () => {
    marks.clearWords(lessonWords.map((w) => w[0]));
    applyFilter('all');
  };

  const value = { marks, srs, speech, account, lesson, selectLesson, filter, applyFilter, resetMarks, viewVersion, words, fellBack, lessonWords, counts, srsCounts };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
```

- [ ] **Step 2: Tạo `src/components/StudyBar.jsx`**

```jsx
import { useApp } from '../context/AppContext.jsx';
import { LESSON_COLORS, VOCAB } from '../lessons.js';
import AudioBar from './AudioBar.jsx';
import FilterBar from './FilterBar.jsx';
import LessonTabs from './LessonTabs.jsx';

// Lesson picker, speech toggle and mark filter: shared by the pages that study a lesson.
export default function StudyBar() {
  const { lesson, selectLesson, marks, speech, counts, filter, fellBack, applyFilter, resetMarks } = useApp();
  return (
    <>
      <LessonTabs lesson={lesson} getMark={marks.getMark} onSelect={selectLesson} />
      <div className="lesson-title" style={{ color: LESSON_COLORS[lesson].a }}>
        {VOCAB[lesson].title}
      </div>
      <AudioBar speech={speech} />
      <FilterBar counts={counts} filter={filter} fellBack={fellBack} onFilter={applyFilter} onReset={resetMarks} />
    </>
  );
}
```

- [ ] **Step 3: Tạo các trang**

`src/pages/DailyPage.jsx`:

```jsx
import SrsPanel from '../components/SrsPanel.jsx';
import SrsSummary from '../components/SrsSummary.jsx';
import { useApp } from '../context/AppContext.jsx';

// Daily spaced-repetition review across all lessons: no lesson tabs or filter here.
export default function DailyPage() {
  const { srs, speech, srsCounts } = useApp();
  return (
    <>
      <SrsSummary counts={srsCounts} active />
      <SrsPanel srs={srs} counts={srsCounts} speech={speech} />
    </>
  );
}
```

`src/pages/ReviewPage.jsx`:

```jsx
import { useState } from 'react';
import CardsPanel from '../components/CardsPanel.jsx';
import ReviewPanel from '../components/ReviewPanel.jsx';
import StudyBar from '../components/StudyBar.jsx';
import { useApp } from '../context/AppContext.jsx';
import { range, shuffle } from '../lessons.js';

const MODE_KEY = 'hsk4_review_mode';
const MODES = [
  ['order', '📇 Theo thứ tự'],
  ['shuffle', '🔀 Xáo trộn'],
];

function loadMode() {
  try {
    return localStorage.getItem(MODE_KEY) === 'shuffle' ? 'shuffle' : 'order';
  } catch {
    return 'order';
  }
}

// Flip through the lesson's cards in order, or in shuffled order. The position lives here and
// resets when the lesson, filter or account data changes (the shell remounts pages on viewVersion).
export default function ReviewPage() {
  const { lesson, words, marks, speech } = useApp();
  const [mode, setMode] = useState(loadMode);
  const [cardIndex, setCardIndex] = useState(0);
  const [review, setReview] = useState(() => ({ order: shuffle(range(words.length)), index: 0 }));
  const { getMark, toggleMark } = marks;

  const pick = (m) => {
    speech.cancel();
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <StudyBar />
      <div className="filter-chips review-mode" role="group" aria-label="Kiểu ôn tập">
        {MODES.map(([m, label]) => (
          <button key={m} type="button" className={'chip' + (m === mode ? ' active' : '')} onClick={() => pick(m)}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'order' ? (
        <CardsPanel lesson={lesson} words={words} index={cardIndex} setIndex={setCardIndex} getMark={getMark} toggleMark={toggleMark} speech={speech} />
      ) : (
        <ReviewPanel words={words} state={review} setState={setReview} getMark={getMark} toggleMark={toggleMark} speech={speech} />
      )}
    </>
  );
}
```

`src/pages/PracticePage.jsx` (tạm, bị xóa ở Task 6):

```jsx
import { useState } from 'react';
import QuizPanel from '../components/QuizPanel.jsx';
import StudyBar from '../components/StudyBar.jsx';
import { useApp } from '../context/AppContext.jsx';

// TEMPORARY: the old quiz, replaced by PracticeHub + ExercisePage in Task 6.
export default function PracticePage() {
  const { words, lessonWords, marks, srs, speech } = useApp();
  const [quiz, setQuiz] = useState(null);
  return (
    <>
      <StudyBar />
      <QuizPanel
        words={words}
        lessonWords={lessonWords}
        state={quiz}
        setState={setQuiz}
        getMark={marks.getMark}
        setMark={marks.setMark}
        lapse={srs.lapse}
        speech={speech}
      />
    </>
  );
}
```

`src/pages/WordsPage.jsx` (tạm, viết lại ở Task 4):

```jsx
import StudyBar from '../components/StudyBar.jsx';

// TEMPORARY: the word list arrives in Task 4.
export default function WordsPage() {
  return <StudyBar />;
}
```

- [ ] **Step 4: Viết lại `src/App.jsx`**

```jsx
import { useEffect, useState } from 'react';
import AccountBar from './components/AccountBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import NavBar from './components/NavBar.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import DailyPage from './pages/DailyPage.jsx';
import PracticePage from './pages/PracticePage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import WordsPage from './pages/WordsPage.jsx';
import { useRoute } from './router.jsx';
import { PAGE_TITLES } from './routes.js';

function Page({ route }) {
  if (route.page === 'words') return <WordsPage />;
  if (route.page === 'review') return <ReviewPage />;
  if (route.page === 'practice' || route.page === 'exercise') return <PracticePage />;
  return <DailyPage />;
}

function Shell() {
  const { account, speech, srsCounts, viewVersion } = useApp();
  const route = useRoute();
  const [authMode, setAuthMode] = useState(null); // null = modal closed

  useEffect(() => {
    speech.cancel();
    document.title = `${PAGE_TITLES[route.page]} · HSK4`;
    // only when the page changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.path]);

  return (
    <>
      <AccountBar account={account} onLogin={() => setAuthMode('login')} />

      <header>
        <h1>📇 Thẻ Từ Vựng HSK4</h1>
      </header>
      <NavBar page={route.page} dueCount={srsCounts.due + srsCounts.learning} />

      {/* viewVersion remounts the page when the lesson, filter or account data changes */}
      <main key={viewVersion}>
        <Page route={route} />
      </main>

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} authenticate={account.authenticate} />}

      <footer>Được biên soạn từ nội dung HSK Standard Course 4 — Bài 1, 2, 3, 4, 5, 6, 7, 8, 9, 10</footer>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
```

- [ ] **Step 5: Sửa `src/components/SrsPanel.jsx`**

Bỏ prop `active` (trang chỉ mount khi đang ở `/daily`):

1. Đổi dòng khai báo và comment phía trên:

```jsx
// Daily spaced-repetition review across all lessons. The page mounts it only while /daily is
// shown, so an unfinished session is dropped when you leave (every graded card is already saved).
export default function SrsPanel({ srs, counts, speech }) {
```

2. Đổi `keys.current = { grade, live: active && !!session && session.queue.length > 0 };` thành:

```jsx
  keys.current = { grade, live: !!session && session.queue.length > 0 };
```

3. Đổi `const cls = 'panel' + (active ? ' active' : '');` thành:

```jsx
  const cls = 'panel';
```

- [ ] **Step 6: Bỏ cơ chế `.panel.active`**

Run:

```bash
sed -i 's/className="panel active"/className="panel"/' src/components/CardsPanel.jsx src/components/ReviewPanel.jsx src/components/QuizPanel.jsx
```

Trong `src/styles.css`, thay hai dòng:

```css
.panel{ max-width:1000px; margin:0 auto; padding:0 16px; display:none; }
.panel.active{ display:block; }
```

bằng:

```css
.panel{ max-width:1000px; margin:0 auto; padding:0 16px; }
```

Thêm cuối `src/styles.css`:

```css

.review-mode{ max-width:900px; margin:0 auto 18px; }
```

Run: `grep -rn "panel active" src` — Expected: không còn kết quả.

- [ ] **Step 7: Xóa `Study.jsx`**

```bash
git rm -q src/components/Study.jsx
```

- [ ] **Step 8: Build và kiểm tra tay**

Run: `npm run build` — Expected: thành công.

Chạy `npm run dev:web` (Vite, cổng 5173), mở trình duyệt (hoặc dùng Playwright MCP):
- Mở `http://localhost:5173/` → URL tự đổi thành `/daily`; bấm Back **không** kẹt ở `/` (Review Focus #3: lần Back đầu rời khỏi app hoặc về trang trước đó, không quay lại `/`).
- Bấm 4 mục NavBar: URL đổi không tải lại trang; `/review` có công tắc Theo thứ tự / Xáo trộn, lật thẻ và đánh dấu như trước; `/practice` chạy quiz cũ; `/words` chỉ có thanh điều khiển.
- F5 trên `/review` vẫn ở `/review`. Tiêu đề tab đổi theo trang.
- `/daily` không hiện tab bài và bộ lọc; bắt đầu ôn, chấm một thẻ chạy bình thường.

- [ ] **Step 9: Commit**

```bash
git add -A src
git commit -m "Split the app into routed pages sharing one AppProvider" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Trang Từ vựng (danh sách thật)

**Files:**
- Create: `src/components/WordRow.jsx`
- Modify: `src/pages/WordsPage.jsx` (viết lại)
- Modify: `src/styles.css` (thêm cuối)

**Interfaces:**
- Consumes: `useApp()` (`words`, `marks`, `speech`), `StudyBar` (Task 3).
- Produces: `<WordRow word mark open onToggleOpen onMark speech />` với `word = [hanzi, pinyin, meaning, exampleZh, exampleVi]`, `mark ∈ 'k'|'r'|''`, `onMark('k'|'r')` (toggle do cha xử lý).

- [ ] **Step 1: Viết `src/components/WordRow.jsx`**

```jsx
const MARKS = [
  ['k', '✅ Đã thuộc'],
  ['r', '🔁 Cần ôn lại'],
];

// One word in the list. The word area expands to show the example sentence; the buttons on the
// right speak the word and toggle the known / needs-review marks.
export default function WordRow({ word, mark, open, onToggleOpen, onMark, speech }) {
  const [hanzi, pinyin, meaning, zh, vi] = word;
  const wordId = 'row-' + hanzi;
  const sentenceId = wordId + '-s';
  const speaking = (id) => (speech.speakingId === id ? ' speaking' : '');
  const cls = 'word-row' + (open ? ' open' : '') + (mark === 'k' ? ' is-known' : mark === 'r' ? ' is-review' : '');

  return (
    <div className={cls}>
      <div className="word-main">
        <button type="button" className="word-toggle" aria-expanded={open} onClick={onToggleOpen}>
          <span className="word-hanzi">{hanzi}</span>
          <span className="word-text">
            <span className="word-pinyin">{pinyin}</span>
            <span className="word-meaning">{meaning}</span>
          </span>
        </button>
        <div className="word-actions">
          {speech.supported && (
            <button type="button" className={'speak-btn mini' + speaking(wordId)} aria-label={'Nghe ' + hanzi} onClick={() => speech.speak(hanzi, wordId)}>
              🔊
            </button>
          )}
          {MARKS.map(([s, label]) => (
            <button key={s} type="button" className={'mark-btn' + (mark === s ? ' active' : '')} data-s={s} onClick={() => onMark(s)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {open && (
        <div className="word-detail">
          <div className="zh">{zh}</div>
          <div className="vi">{vi}</div>
          {speech.supported && (
            <button type="button" className={'speak-btn mini' + speaking(sentenceId)} onClick={() => speech.speak(zh, sentenceId)}>
              🔊 Nghe câu
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Viết lại `src/pages/WordsPage.jsx`**

```jsx
import { useState } from 'react';
import StudyBar from '../components/StudyBar.jsx';
import WordRow from '../components/WordRow.jsx';
import { useApp } from '../context/AppContext.jsx';

// The lesson's words as a list. `words` only changes when the lesson, filter or account data
// changes, so a row stays in place after you mark it.
export default function WordsPage() {
  const { words, marks, speech } = useApp();
  const [openHanzi, setOpenHanzi] = useState(null); // one expanded row at a time

  return (
    <>
      <StudyBar />
      <div className="panel word-list">
        {words.map((w) => (
          <WordRow
            key={w[0]}
            word={w}
            mark={marks.getMark(w[0])}
            open={openHanzi === w[0]}
            onToggleOpen={() => setOpenHanzi(openHanzi === w[0] ? null : w[0])}
            onMark={(s) => marks.toggleMark(w[0], s)}
            speech={speech}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Thêm CSS (cuối `src/styles.css`)**

```css

/* ---------- WORD LIST ---------- */
.word-list{ display:flex; flex-direction:column; gap:10px; }
.word-row{ background:#fff; border-radius:18px; border:2px solid transparent; box-shadow:0 4px 14px rgba(0,0,0,.06); overflow:hidden; }
.word-row.is-known{ border-color:#2f9e44; }
.word-row.is-review{ border-color:#e03131; }
.word-main{ display:flex; align-items:center; gap:10px; padding:10px 14px; flex-wrap:wrap; }
.word-toggle{ flex:1 1 220px; min-width:0; display:flex; align-items:center; gap:14px; border:none; background:transparent; cursor:pointer; text-align:left; font:inherit; color:inherit; padding:4px 0; }
.word-hanzi{ font-size:clamp(26px,5vw,34px); font-weight:900; color:var(--accent-a,#333); min-width:2.2em; }
.word-text{ display:flex; flex-direction:column; min-width:0; }
.word-pinyin{ font-size:16px; font-weight:700; color:#555; }
.word-meaning{ font-size:15px; color:#666; overflow-wrap:anywhere; }
.word-actions{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.word-actions .mark-btn{ padding:8px 12px; font-size:14px; min-height:40px; flex:0 0 auto; }
.word-actions .speak-btn.mini{ padding:8px 12px; }
.word-detail{ padding:4px 16px 14px; border-top:1px dashed #e4e4ec; display:flex; flex-direction:column; align-items:flex-start; gap:6px; }
.word-detail .zh{ font-size:clamp(18px,3.5vw,24px); font-weight:700; overflow-wrap:anywhere; }
.word-detail .vi{ font-size:15px; color:#666; overflow-wrap:anywhere; }
@media (max-width:600px){
  .word-actions{ width:100%; }
  .word-actions .mark-btn{ flex:1 1 calc(50% - 40px); }
}
```

- [ ] **Step 3b: Kiểm tra tay trên `npm run dev:web`**

Mở `/words`:
- Mỗi dòng có hán tự, pinyin, nghĩa, 🔊, hai nút đánh dấu. Bấm vào chữ/nghĩa mở câu ví dụ (hán tự + nghĩa Việt) và nút 🔊 Nghe câu; mở dòng khác thì dòng trước đóng.
- Bấm ✅ rồi bấm lại ✅ → bỏ đánh dấu. `FilterBar` cập nhật số đếm.
- (Review Focus #6) Chọn bộ lọc "Chưa đánh dấu", đánh dấu một từ: dòng **vẫn ở yên**; đổi bộ lọc rồi quay lại thì dòng đó mới biến mất.
- (Review Focus #4) Chọn "Đã thuộc" khi bài chưa có từ nào đã thuộc: hiện cả bài kèm ghi chú "Chưa có từ nào ở mục này…".
- Màn hình hẹp (DevTools 375px): hàng nút không tràn ngang.

- [ ] **Step 4: Build rồi commit**

Run: `npm run build` — Expected: thành công.

```bash
git add src/components/WordRow.jsx src/pages/WordsPage.jsx src/styles.css
git commit -m "Add the vocabulary list page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hỗ trợ cho bài tập một dạng trong `quiz.js` (TDD)

**Files:**
- Modify: `src/quiz.js`
- Modify: `tests/quiz.test.mjs`

**Interfaces:**
- Consumes: `applicableTypes`, `buildQuiz` có sẵn trong `src/quiz.js`.
- Produces:
  - `PRACTICE_COUNT: 20`
  - `countApplicable(words: Word[], type: string, { canSpeak: boolean }) => number`: số từ mà dạng `type` dùng được.

- [ ] **Step 1: Viết test (sẽ fail)**

Trong `tests/quiz.test.mjs`, đổi dòng import:

```js
import { QUIZ_TYPES, applicableTypes, buildQuiz, checkPinyin, makeQuestion, pinyinKey } from '../src/quiz.js';
```

thành:

```js
import { PRACTICE_COUNT, QUIZ_TYPES, applicableTypes, buildQuiz, checkPinyin, countApplicable, makeQuestion, pinyinKey } from '../src/quiz.js';
```

Thêm vào cuối file:

```js

test('countApplicable() counts the words one exercise type can use', () => {
  const noSentence = W('学', 'xué', 'học (đgt)', '我喜欢读书。'); // sentence lacks the word itself
  const words = [...LESSON, noSentence];
  assert.equal(countApplicable(words, 'meaning', { canSpeak: true }), 6);
  assert.equal(countApplicable(words, 'fill', { canSpeak: true }), 5);
  assert.equal(countApplicable(words, 'listen', { canSpeak: true }), 6);
  assert.equal(countApplicable(words, 'listen', { canSpeak: false }), 0);
  assert.equal(countApplicable([], 'pinyin', { canSpeak: true }), 0);
});

test('buildQuiz() with one type caps at PRACTICE_COUNT, one question per word', () => {
  const many = Array.from({ length: 30 }, (_, i) => W('字' + i, 'zi' + i, 'nghĩa ' + i, '句子字' + i + '。'));
  const qs = buildQuiz(many, { types: ['hanzi'], count: PRACTICE_COUNT }, many, many, { canSpeak: true, rng: seeded(7) });
  assert.equal(PRACTICE_COUNT, 20);
  assert.equal(qs.length, PRACTICE_COUNT);
  assert.ok(qs.every((q) => q.type === 'hanzi'));
  assert.equal(new Set(qs.map((q) => q.word[0])).size, PRACTICE_COUNT);
});

test('buildQuiz() returns no questions when the type fits none of the words', () => {
  const none = [W('学', 'xué', 'học', '我喜欢读书。')];
  assert.deepEqual(buildQuiz(none, { types: ['fill'], count: PRACTICE_COUNT }, none, none, { canSpeak: true }), []);
  assert.deepEqual(buildQuiz(LESSON, { types: ['listen'], count: PRACTICE_COUNT }, LESSON, ALL, { canSpeak: false }), []);
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `node --test tests/quiz.test.mjs`
Expected: FAIL (`countApplicable` / `PRACTICE_COUNT` không được export).

- [ ] **Step 3: Thêm vào `src/quiz.js`**

Ngay sau hàm `applicableTypes` (trước dòng `const shown = ...`):

```js

// Questions per practice run.
export const PRACTICE_COUNT = 20;

// How many of the words this one exercise type can ask about.
export function countApplicable(words, type, { canSpeak }) {
  return words.filter((w) => applicableTypes(w, [type], { canSpeak }).length > 0).length;
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm run test:unit`
Expected: tất cả PASS.

- [ ] **Step 5: Commit**

```bash
git add src/quiz.js tests/quiz.test.mjs
git commit -m "Add per-type counting and run size for practice exercises" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Trang Thực hành: hub chọn dạng và trang làm bài

**Files:**
- Create: `src/components/PracticeHub.jsx`, `src/pages/ExercisePage.jsx`
- Modify: `src/components/FilterBar.jsx` (xuất `FILTER_LABELS`), `src/App.jsx`, `src/styles.css`
- Delete: `src/components/QuizPanel.jsx`, `src/pages/PracticePage.jsx`

**Interfaces:**
- Consumes: `useApp()`, `StudyBar`, `Link` (Task 2), `QUIZ_TYPES`/`PRACTICE_COUNT`/`countApplicable`/`buildQuiz` (Task 5), `ChoiceQuestion`, `PinyinQuestion` (giữ nguyên), `ALL_WORDS`, `LESSON_LABELS`, `WORD_BY_HANZI` từ `lessons.js`.
- Produces:
  - `FILTER_LABELS: Record<'all'|'new'|'r'|'k', string>` xuất từ `FilterBar.jsx`.
  - `<PracticeHub />` (route `/practice`) và `<ExercisePage type />` (route `/practice/:type`).

- [ ] **Step 1: Xuất `FILTER_LABELS` trong `src/components/FilterBar.jsx`**

Ngay sau mảng `CHIPS`, thêm:

```jsx

export const FILTER_LABELS = Object.fromEntries(CHIPS);
```

- [ ] **Step 2: Viết `src/components/PracticeHub.jsx`**

```jsx
import { useApp } from '../context/AppContext.jsx';
import { QUIZ_TYPES, countApplicable } from '../quiz.js';
import { Link } from '../router.jsx';
import StudyBar from './StudyBar.jsx';

const DESC = {
  meaning: 'Thấy chữ Hán, chọn nghĩa tiếng Việt đúng.',
  hanzi: 'Thấy nghĩa tiếng Việt, chọn chữ Hán đúng.',
  listen: 'Nghe phát âm, chọn chữ Hán đúng.',
  pinyin: 'Thấy chữ Hán, gõ pinyin (phải đúng dấu thanh).',
  fill: 'Chọn từ còn thiếu trong câu ví dụ.',
};

// Pick an exercise type for the words of the chosen lesson and filter.
export default function PracticeHub() {
  const { words, speech } = useApp();
  const canSpeak = speech.supported;
  return (
    <>
      <StudyBar />
      <div className="panel practice-hub">
        {QUIZ_TYPES.map(([type, label]) => {
          const n = countApplicable(words, type, { canSpeak });
          const note = type === 'listen' && !canSpeak ? 'Trình duyệt không hỗ trợ đọc' : n ? `${n} từ` : 'Không có từ phù hợp';
          const body = (
            <>
              <div className="exercise-name">{label}</div>
              <div className="exercise-desc">{DESC[type]}</div>
              <div className="exercise-count">{note}</div>
            </>
          );
          return n ? (
            <Link key={type} to={'/practice/' + type} className="exercise-card">
              {body}
            </Link>
          ) : (
            <div key={type} className="exercise-card off" aria-disabled="true">
              {body}
            </div>
          );
        })}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Viết `src/pages/ExercisePage.jsx`**

Logic chấm và câu hỏi giữ nguyên từ `QuizPanel` cũ; chỉ bỏ màn hình cài đặt và bảng điểm theo dạng.

```jsx
import { useState } from 'react';
import ChoiceQuestion from '../components/ChoiceQuestion.jsx';
import { FILTER_LABELS } from '../components/FilterBar.jsx';
import PinyinQuestion from '../components/PinyinQuestion.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ALL_WORDS, LESSON_LABELS, WORD_BY_HANZI } from '../lessons.js';
import { PRACTICE_COUNT, QUIZ_TYPES, buildQuiz } from '../quiz.js';
import { Link } from '../router.jsx';

const TYPE_LABEL = Object.fromEntries(QUIZ_TYPES);

// One practice run of a single exercise type. Starts as soon as the page opens; leaving the page
// (or F5) drops an unfinished run.
export default function ExercisePage({ type }) {
  const { lesson, filter, words, lessonWords, marks, srs, speech } = useApp();
  const { getMark, setMark } = marks;
  const canSpeak = speech.supported;

  // state: { questions, index, answered, results }
  const fresh = (pool, count = PRACTICE_COUNT) => ({
    questions: buildQuiz(pool, { types: [type], count }, lessonWords, ALL_WORDS, { canSpeak }),
    index: 0,
    answered: null,
    results: [],
  });
  const [state, setState] = useState(() => fresh(words));
  const restart = (pool, count) => {
    speech.cancel();
    setState(fresh(pool, count));
  };

  const { questions, index, answered, results } = state;
  const back = (
    <Link to="/practice" className="btn secondary">
      ← Chọn dạng khác
    </Link>
  );

  let body;
  if (!questions.length) {
    body = (
      <div className="fillblank-box quiz-done">
        <div className="filter-note">Không có từ nào phù hợp với dạng “{TYPE_LABEL[type]}” trong tập từ đang chọn.</div>
        <div className="controls">{back}</div>
      </div>
    );
  } else if (index >= questions.length) {
    const score = results.filter((r) => r.ok).length;
    const wrong = results.filter((r) => !r.ok).map((r) => WORD_BY_HANZI[r.hanzi]);
    body = (
      <div className="fillblank-box quiz-done">
        <h2>
          Kết quả: {score} / {results.length}
        </h2>
        {wrong.length ? (
          <div className="quiz-wrong">
            <div className="quiz-label">Các từ trả lời sai</div>
            {wrong.map((w) => (
              <div key={w[0]} className="quiz-reveal bad">
                {w[0]} · {w[1]} · {w[2]}
              </div>
            ))}
          </div>
        ) : (
          <div className="srs-note">🎉 Không sai câu nào!</div>
        )}
        <div className="controls">
          {wrong.length > 0 && (
            <button className="btn" onClick={() => restart(wrong, 'all')}>
              🔁 Làm lại câu sai
            </button>
          )}
          <button className="btn" onClick={() => restart(words)}>
            ▶ Lượt mới
          </button>
          {back}
        </div>
      </div>
    );
  } else {
    const q = questions[index];
    const answer = (given, ok, result) => {
      if (answered) return;
      const h = q.word[0];
      if (!ok) {
        if (getMark(h) !== 'r') setMark(h, 'r');
        srs.lapse(h); // back into today's daily review
      }
      speech.speak(q.type === 'fill' ? q.word[3] : h, 'quiz');
      setState({ ...state, answered: { given, ok, result }, results: [...results, { hanzi: h, type: q.type, ok }] });
    };
    const next = () => {
      speech.cancel();
      setState({ ...state, index: index + 1, answered: null });
    };
    body = (
      <div className="fillblank-box">
        <div className="progress">
          Câu {index + 1} / {questions.length} · {TYPE_LABEL[q.type]}
        </div>
        {q.type === 'pinyin' ? (
          <PinyinQuestion key={index} q={q} answered={answered} onAnswer={answer} />
        ) : (
          <ChoiceQuestion key={index} q={q} answered={answered} onAnswer={answer} speech={speech} />
        )}
        {answered && (
          <div className={'quiz-reveal ' + (answered.ok ? 'ok' : 'bad')}>
            {answered.ok ? '✅ ' : '❌ '}
            {q.word[0]} · {q.word[1]} · {q.word[2]}
          </div>
        )}
        <div className="controls">
          <Link to="/practice" className="btn secondary">
            ✖ Dừng
          </Link>
          {answered && (
            <button key={'next' + index} className="btn" autoFocus onClick={next}>
              {index + 1 < questions.length ? 'Tiếp ▶' : 'Xem kết quả ▶'}
            </button>
          )}
        </div>
        <div className="fb-score">
          Điểm: {results.filter((r) => r.ok).length} / {results.length}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="exercise-top">
        <Link to="/practice" className="link-btn">
          ← Chọn dạng khác
        </Link>
        <span className="exercise-summary">
          {TYPE_LABEL[type]} · {LESSON_LABELS[lesson]} · {FILTER_LABELS[filter]} · {words.length} từ
        </span>
      </div>
      {body}
    </div>
  );
}
```

- [ ] **Step 4: Cập nhật `Shell` trong `src/App.jsx`**

Đổi import: bỏ `import PracticePage from './pages/PracticePage.jsx';`, thêm:

```jsx
import ExercisePage from './pages/ExercisePage.jsx';
import PracticeHub from './components/PracticeHub.jsx';
```

Đổi hàm `Page`:

```jsx
function Page({ route }) {
  if (route.page === 'words') return <WordsPage />;
  if (route.page === 'review') return <ReviewPage />;
  if (route.page === 'practice') return <PracticeHub />;
  if (route.page === 'exercise') return <ExercisePage key={route.params.type} type={route.params.type} />;
  return <DailyPage />;
}
```

- [ ] **Step 5: Xóa file cũ**

```bash
git rm -q src/components/QuizPanel.jsx src/pages/PracticePage.jsx
```

- [ ] **Step 6: Thêm CSS (cuối `src/styles.css`)**

```css

/* ---------- PRACTICE ---------- */
a.btn{ display:inline-block; text-decoration:none; text-align:center; }
a.link-btn{ text-decoration:none; }
.practice-hub{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
.exercise-card{ display:flex; flex-direction:column; gap:6px; background:#fff; border-radius:20px; padding:18px; text-decoration:none; color:inherit; border:2px solid transparent; box-shadow:0 4px 14px rgba(0,0,0,.06); }
a.exercise-card:hover{ border-color:var(--accent-a,#333); }
.exercise-card.off{ opacity:.5; }
.exercise-name{ font-size:20px; font-weight:900; color:var(--accent-a,#333); }
.exercise-desc{ font-size:15px; color:#555; }
.exercise-count{ font-size:14px; font-weight:700; color:#777; margin-top:auto; }
.exercise-top{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
.exercise-summary{ font-size:14px; font-weight:700; color:#666; }
```

- [ ] **Step 7: Build, test và kiểm tra tay**

Run: `npm run test:unit` và `npm run build` — Expected: cả hai thành công.

Trên `npm run dev:web`:
- `/practice`: 5 thẻ, mỗi thẻ có số từ; "Điền từ vào câu" ít hơn các dạng khác nếu có từ không xuất hiện trong câu ví dụ. Bấm thẻ → làm ngay, không có màn hình cài đặt; thanh trên cùng hiện "Tên dạng · Bài X · Bộ lọc · N từ".
- Làm hết một lượt (tối đa 20 câu); câu sai đặt dấu "Cần ôn" (kiểm ở `/words`) và thẻ vào hàng `/daily`. Màn kết quả có điểm, danh sách từ sai, 🔁 Làm lại câu sai, ▶ Lượt mới, ← Chọn dạng khác. ✖ Dừng về `/practice`.
- `/practice/pinyin`: gõ đúng chữ sai thanh → báo "Sai dấu thanh"; gõ `fa3lv4` hoặc `fǎlǜ` đều nhận. Không có checkbox "không cần dấu thanh".
- (Review Focus #1) Vào thẳng `/practice/fill` với bộ lọc/bài mà không từ nào phù hợp (hoặc, để giả lập, tạm thời đổi ví dụ trong DevTools là không cần; chỉ cần xác nhận `buildQuiz` rỗng đã test ở Task 5) — nếu không tái hiện được bằng dữ liệu thật, xác nhận trong code rằng nhánh `!questions.length` hiện ghi chú và nút quay lại. `/practice/listen` khi trình duyệt không có Web Speech: thẻ bị khóa trên hub, và vào thẳng URL thì hiện ghi chú.
- (Review Focus #4) Bộ lọc không có từ (rơi về cả bài): số từ trên các thẻ khớp số từ ở dòng tóm tắt.
- `/practice/xyz` → URL đổi thành `/practice`.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "Split practice into exercise types without a settings screen" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Dọn CSS, README, kiểm tra cuối

**Files:**
- Modify: `src/styles.css`, `README.md`

**Interfaces:**
- Consumes: mọi thứ ở các task trước.
- Produces: không có API mới; app hoàn chỉnh, tài liệu khớp.

- [ ] **Step 1: Xóa rule `.mode-tab(s)` không còn dùng**

Run: `grep -rn "mode-tab" src` — Expected: chỉ còn trong `src/styles.css`.

Trong `src/styles.css` xóa khối:

```css
.mode-tabs{
  max-width:900px; margin:0 auto 26px; display:flex; justify-content:center; gap:10px;
  background:#ffffffaa; border-radius:18px; padding:8px; flex-wrap:wrap;
}
.mode-tab{
  border:none; background:transparent; cursor:pointer; padding:12px 20px; border-radius:14px;
  font-size:16px; font-weight:700; color:#555;
}
.mode-tab.active{ background:var(--accent,#333); color:#fff; }
```

và hai dòng trong media query `max-width:600px`:

```css
  .mode-tabs{ margin:0 10px 18px; padding:6px; gap:4px; border-radius:16px; }
  .mode-tab{ flex:1 1 0; min-width:0; padding:10px 4px; font-size:13px; line-height:1.3; }
```

Run: `grep -rn "mode-tab" src` — Expected: không còn kết quả.

- [ ] **Step 2: Cập nhật `README.md`**

Thay đoạn mở đầu:

```md
Daily spaced-repetition review (Anki-style, SM-2), flashcards, shuffled review and a five-type quiz
(hanzi → meaning, meaning → hanzi, listening, typing pinyin, fill-in-the-blank) for HSK4 (lessons 1-10),
with pronunciation (Web Speech API) and per-word "known / needs review" marks.
```

bằng:

```md
Daily spaced-repetition review (Anki-style, SM-2), a vocabulary list, flashcard review (in order or
shuffled) and five practice exercises (hanzi → meaning, meaning → hanzi, listening, typing pinyin,
fill-in-the-blank) for HSK4 (lessons 1-10), with pronunciation (Web Speech API) and per-word
"known / needs review" marks.

## Pages

| Path | Page |
|---|---|
| `/daily` | Daily review: the spaced-repetition queue across all lessons |
| `/words` | Vocabulary list of the chosen lesson: pinyin, meaning, example sentence, marks |
| `/review` | Flip through the lesson's cards in order or shuffled |
| `/practice` | Pick an exercise type; `/practice/meaning`, `/hanzi`, `/listen`, `/pinyin`, `/fill` run one |

Paths are real URLs (History API), so the host must serve `index.html` for them. Cloudflare Pages does
that when `dist/` has no `404.html`; `/api/*` still goes to the Functions.
```

Trong bảng Layout, thay dòng `index.html`, `src/` và thêm các dòng mới ngay sau nó:

```md
| `index.html`, `src/` | Vite + React frontend (`App.jsx`, `pages/`, `components/`, `hooks/`, `styles.css`) |
| `src/routes.js`, `src/router.jsx` | URL → page matching (pure, unit-tested) and the History API router (`useRoute`, `Link`) |
| `src/context/AppContext.jsx` | `AppProvider` / `useApp()`: marks, daily review, speech, account sync, chosen lesson and filter |
```

Và dòng test:

```md
| `tests/srs.test.mjs`, `tests/quiz.test.mjs` | Unit tests for the scheduler and the quiz (no server needed) |
```

thành:

```md
| `tests/srs.test.mjs`, `tests/quiz.test.mjs`, `tests/router.test.mjs` | Unit tests for the scheduler, the quiz and URL matching (no server needed) |
```

Câu "Without a backend (e.g. GitHub Pages) …" **giữ nguyên** (chưa xác nhận nhánh GitHub Pages có dùng chung code này không; báo lại cho người dùng ở bước cuối).

- [ ] **Step 3: Chạy toàn bộ kiểm tra tự động**

Run: `npm run test:unit && npm run build`
Expected: tất cả test PASS, build thành công.

- [ ] **Step 4: Kiểm tra fallback SPA trên bản build giống production**

Run (cần `.dev.vars` và D1 local theo README: `cp .dev.vars.example .dev.vars`, `npm run db:local`):

```bash
npm run preview
```

Ở terminal khác:

```bash
for p in / /daily /words /review /practice /practice/pinyin /nope; do printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:8788$p; done
curl -s -o /dev/null -w "/api/me %{http_code} %{content_type}\n" http://localhost:8788/api/me
```

Expected: mọi đường dẫn trang trả `200 text/html…`; `/api/me` vẫn trả JSON (không phải HTML). Nếu `/words` trả 404, kiểm tra `dist/` không có `404.html`.

- [ ] **Step 5: Kiểm tra giao diện bằng trình duyệt (Playwright MCP hoặc tay) trên `npm run dev`**

(`npm run dev` chạy cả API để thử đăng nhập.)

- Đi qua 4 trang bằng NavBar; mục đang mở sáng; "Thực hành" vẫn sáng ở `/practice/pinyin`; badge ở "Ôn hằng ngày" khớp số thẻ ôn.
- F5 trên `/words` và `/practice/pinyin`; Back/Forward giữa các trang đúng.
- (Review Focus #3) Mở `/index.html` hoặc `/` → về `/daily`, bấm Back không kẹt.
- Chấm một thẻ SRS ở `/daily`, tải lại trang: tiến độ còn.
- (Review Focus #5) Đăng nhập một tài khoản đã có dữ liệu trên server khi đang ở `/words`: danh sách và số đếm dựng lại theo dữ liệu mới.
- Chụp màn hình viewport 375px của cả 5 màn hình (daily, words, review, practice hub, một câu hỏi) và kiểm tra không có cuộn ngang, NavBar chia đều 4 ô.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove old mode tabs and document the page structure" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review (đã thực hiện khi viết kế hoạch)

- **Phủ spec:** Router (§2) → Task 1–2; cấu trúc và context (§3) → Task 3; `/daily` → Task 3; `/words` → Task 4; `/review` → Task 3; `/practice` + `/practice/:dạng`, mặc định 20 câu, pinyin có dấu thanh, bỏ cài đặt → Task 5–6; NavBar, header, badge, `document.title`, CSS (§5) → Task 2, 3, 7; hành vi có chủ ý (§6) → Task 3 (SrsPanel/ReviewPage), Task 6 (ExercisePage); kiểm thử (§7) → Task 1, 5, 7; triển khai và README (§8) → Task 7. Ghi chú chênh lệch với spec nằm ở phần "Cấu trúc file".
- **Placeholder:** hai file tạm (`PracticePage`, `WordsPage` ở Task 3) được ghi rõ là tạm và được thay hoàn toàn ở Task 6 và Task 4.
- **Nhất quán tên:** `useApp`, `AppProvider`, `StudyBar`, `FILTER_LABELS`, `PRACTICE_COUNT`, `countApplicable`, `matchRoute`, `PAGES`, `PAGE_TITLES`, `navigate`, `useRoute`, `Link` dùng thống nhất ở mọi task.
