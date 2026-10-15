// Grammar points and the practice logic, with no React so Node tests can use them.
import RAW from './data/grammar.json' with { type: 'json' };
import { shuffle } from './random.js';

// lesson ('L1') -> its points in textbook order. Lessons not written yet have no key (or []).
export const GRAMMAR = RAW;
export const ALL_POINTS = Object.values(GRAMMAR).flat();
export const POINT_BY_ID = Object.fromEntries(ALL_POINTS.map((p) => [p.id, p]));

const NONE = [];
export const pointsOf = (lesson) => GRAMMAR[lesson] || NONE;

// Grammar marks live in the vocabulary marks store; the prefix keeps them apart from hanzi.
export const grammarKey = (id) => 'g:' + id;
export const lessonOf = (id) => 'L' + String(id).split('.')[0];

export const GRAMMAR_FILTERS = [
  ['all', 'Tất cả'],
  ['new', 'Chưa đánh dấu'],
  ['r', '🔁 Cần ôn'],
  ['k', '✅ Đã nắm'],
];
export const FILTER_NAMES = Object.fromEntries(GRAMMAR_FILTERS);
const FILTER_KEY = 'hsk4_grammar_filter';

export function loadGrammarFilter() {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return Object.hasOwn(FILTER_NAMES, f) ? f : 'all';
  } catch {
    return 'all';
  }
}

export function saveGrammarFilter(f) {
  try {
    localStorage.setItem(FILTER_KEY, f);
  } catch {
    /* private mode / quota: the filter just isn't remembered */
  }
}

// The points matching the filter; when none match, the whole lesson (fellBack), like the word lists.
// `keyOf` maps a point id to its marks key (grammar by default; the compare section passes its own).
export function filterPoints(points, filter, getMark, keyOf = grammarKey) {
  const list = points.filter((p) => {
    const m = getMark(keyOf(p.id));
    return filter === 'all' || (filter === 'new' ? m === '' : m === filter);
  });
  return list.length || !points.length ? { points: list, fellBack: false } : { points, fellBack: true };
}

export function countPoints(points, getMark, keyOf = grammarKey) {
  let k = 0;
  let r = 0;
  points.forEach((p) => {
    const m = getMark(keyOf(p.id));
    if (m === 'k') k++;
    else if (m === 'r') r++;
  });
  return { n: points.length, k, r, fresh: points.length - k - r };
}

export const reviewPoints = (getMark) => ALL_POINTS.filter((p) => getMark(grammarKey(p.id)) === 'r');

// For LessonTabs: known points / points of each lesson.
export const grammarProgress = (getMark) => (lesson) => {
  const c = countPoints(pointsOf(lesson), getMark);
  return { done: c.k, total: c.n };
};

// Compare sentences without spaces or punctuation (Chinese or ASCII).
export const normalize = (s) => String(s).replace(/[\s\p{P}]/gu, '');

export function checkOrder(given, q) {
  const g = normalize(given);
  return g !== '' && [q.answer, ...(q.alt || [])].some((a) => normalize(a) === g);
}

// Shuffle the parts until their order differs from the answer's (when that is possible). Tiles keep
// their index so two parts with the same text stay distinct.
export function scramble(parts, rng = Math.random) {
  const tiles = parts.map((text, i) => ({ i, text }));
  const goal = parts.join('');
  let out = shuffle(tiles, rng);
  for (let n = 0; n < 20 && out.map((t) => t.text).join('') === goal; n++) out = shuffle(tiles, rng);
  return out;
}

function prepare(q, pointId, rng) {
  if (q.type === 'order') return { ...q, pointId, tiles: scramble(q.parts, rng) };
  return { ...q, pointId, options: shuffle(q.options, rng) };
}

// Every question of the given items ({ id, questions }), each passed through prepare(q, id, rng), shuffled.
// With `max`, questions are taken round-robin over the items (in random order) so one item with many
// questions cannot fill the run.
export function buildRoundRobin(items, prepare, { max = Infinity, rng = Math.random } = {}) {
  const queues = shuffle(items, rng).map((it) => shuffle(it.questions, rng).map((q) => prepare(q, it.id, rng)));
  const picked = [];
  for (let round = 0; picked.length < max; round++) {
    const row = queues.filter((qs) => round < qs.length).map((qs) => qs[round]);
    if (!row.length) break;
    picked.push(...row.slice(0, max - picked.length));
  }
  return shuffle(picked, rng);
}

export const buildGrammarQuiz = (points, opts = {}) => buildRoundRobin(points, prepare, opts);

// The same questions again (e.g. the wrong ones), in a new order with options and parts reshuffled.
export const retryQuiz = (questions, rng = Math.random) => shuffle(questions, rng).map((q) => prepare(q, q.pointId, rng));

// ---------- data checks (used by the tests) ----------

const isText = (s) => typeof s === 'string' && s.trim() !== '';

function checkQuestion(q, at) {
  const e = [];
  if (q.type === 'choice') {
    if (typeof q.q !== 'string' || q.q.split('___').length !== 2) e.push(`${at}: q phải có đúng một ___`);
    const opts = Array.isArray(q.options) ? q.options : [];
    if (opts.length !== 4 || new Set(opts).size !== 4 || !opts.every(isText)) e.push(`${at}: cần 4 lựa chọn khác nhau`);
    if (!opts.includes(q.answer)) e.push(`${at}: answer không nằm trong options`);
    if (!isText(q.explain)) e.push(`${at}: thiếu explain`);
  } else if (q.type === 'order') {
    const parts = Array.isArray(q.parts) ? q.parts : [];
    if (parts.length < 3 || !parts.every(isText)) e.push(`${at}: cần ≥ 3 cụm`);
    if (!isText(q.answer) || normalize(parts.join('')) !== normalize(q.answer)) e.push(`${at}: parts ghép lại không ra answer`);
    if (q.alt !== undefined && (!Array.isArray(q.alt) || !q.alt.every(isText))) e.push(`${at}: alt phải là mảng chuỗi`);
    if (!isText(q.vi)) e.push(`${at}: thiếu vi`);
  } else {
    e.push(`${at}: type lạ "${q.type}"`);
  }
  return e;
}

function checkPoint(p) {
  const e = [];
  const at = p.id;
  for (const f of ['title', 'pattern', 'meaning']) if (!isText(p[f])) e.push(`${at}: thiếu ${f}`);
  if (!Array.isArray(p.notes) || !p.notes.every(isText)) e.push(`${at}: notes phải là mảng chuỗi`);
  const ex = Array.isArray(p.examples) ? p.examples : [];
  if (ex.length < 3) e.push(`${at}: cần ≥ 3 ví dụ`);
  ex.forEach((x, j) => {
    if (!Array.isArray(x) || x.length !== 3 || !x.every(isText)) e.push(`${at}: ví dụ ${j + 1} phải là [hán tự, pinyin, nghĩa]`);
  });
  const qs = Array.isArray(p.questions) ? p.questions : [];
  if (qs.length < 6) e.push(`${at}: cần ≥ 6 câu hỏi`);
  const types = new Set(qs.map((q) => q.type));
  if (!types.has('choice') || !types.has('order')) e.push(`${at}: cần cả câu choice và order`);
  qs.forEach((q, j) => e.push(...checkQuestion(q, `${at} câu ${j + 1}`)));
  return e;
}

// Every problem in the grammar data, as readable messages; [] when it is valid.
export function validateGrammar(data, lessonKeys) {
  const errors = [];
  const seen = new Set();
  for (const [lesson, points] of Object.entries(data)) {
    if (!lessonKeys.includes(lesson)) errors.push(`${lesson}: không có trong vocab.json`);
    if (!Array.isArray(points)) {
      errors.push(`${lesson}: phải là mảng`);
      continue;
    }
    if (points.length && points.length !== 5) errors.push(`${lesson}: cần đúng 5 điểm, có ${points.length}`);
    points.forEach((p, i) => {
      const id = `${lesson.slice(1)}.${i + 1}`;
      if (p.id !== id) errors.push(`${lesson}[${i}]: id phải là "${id}", đang là "${p.id}"`);
      if (seen.has(p.id)) errors.push(`id trùng: ${p.id}`);
      seen.add(p.id);
      errors.push(...checkPoint(p));
    });
  }
  return errors;
}
