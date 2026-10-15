// Confusable word groups and their practice logic, with no React so Node tests can use them.
import RAW from './data/compare.json' with { type: 'json' };
import { GRAMMAR_FILTERS, buildRoundRobin, countPoints, filterPoints } from './grammar.js';
import { shuffle } from './random.js';

export { FILTER_NAMES, lessonOf } from './grammar.js';

// lesson ('L1') -> its groups. Lessons not written yet have no key (or []).
export const COMPARE = RAW;
export const ALL_PAIRS = Object.values(COMPARE).flat();
export const PAIR_BY_ID = Object.fromEntries(ALL_PAIRS.map((p) => [p.id, p]));

const NONE = [];
export const pairsOf = (lesson) => COMPARE[lesson] || NONE;

// Group marks live in the vocabulary marks store; the prefix keeps them apart from hanzi and grammar.
export const compareKey = (id) => 'c:' + id;
export const pairTitle = (p) => p.words.map((w) => w[0]).join(' / ');

export const COMPARE_FILTERS = GRAMMAR_FILTERS;
const FILTER_KEY = 'hsk4_compare_filter';
const FILTER_IDS = GRAMMAR_FILTERS.map(([f]) => f);

export function loadCompareFilter() {
  try {
    const f = localStorage.getItem(FILTER_KEY);
    return FILTER_IDS.includes(f) ? f : 'all';
  } catch {
    return 'all';
  }
}

export function saveCompareFilter(f) {
  try {
    localStorage.setItem(FILTER_KEY, f);
  } catch {
    /* private mode / quota: the filter just isn't remembered */
  }
}

export const filterPairs = (pairs, filter, getMark) => filterPoints(pairs, filter, getMark, compareKey);
export const countPairs = (pairs, getMark) => countPoints(pairs, getMark, compareKey);
export const reviewPairs = (getMark) => ALL_PAIRS.filter((p) => getMark(compareKey(p.id)) === 'r');

// For LessonTabs: known groups / groups of each lesson.
export const compareProgress = (getMark) => (lesson) => {
  const c = countPairs(pairsOf(lesson), getMark);
  return { done: c.k, total: c.n };
};

// Pinyin without tone marks, case, spaces or apostrophes ("Suǒ Yǒu" -> "suoyou", "lǜ" -> "lu").
export const toneless = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s'’]/g, '')
    .toLowerCase();

// Groups with a word whose hanzi contains the query, or whose toneless pinyin contains it.
export function searchPairs(query, pairs = ALL_PAIRS) {
  const q = String(query).trim();
  if (!q) return [];
  const plain = toneless(q);
  return pairs.filter((p) => p.words.some(([hz, py]) => hz.includes(q) || toneless(py).includes(plain)));
}

// The choices of a question are always the words of its group.
const withOptions = (p) => ({ id: p.id, questions: p.questions.map((q) => ({ ...q, options: p.words.map((w) => w[0]) })) });
const prepare = (q, pairId, rng) => ({ ...q, pairId, options: shuffle(q.options, rng) });

export const buildCompareQuiz = (pairs, opts = {}) => buildRoundRobin(pairs.map(withOptions), prepare, opts);

// The same questions again (e.g. the wrong ones), in a new order with the options reshuffled.
export const retryCompareQuiz = (questions, rng = Math.random) => shuffle(questions, rng).map((q) => prepare(q, q.pairId, rng));

// ---------- data checks (used by the tests) ----------

const isText = (s) => typeof s === 'string' && s.trim() !== '';

function checkPair(p, lesson, home, order) {
  const e = [];
  const at = p.id;
  const words = Array.isArray(p.words) ? p.words : [];
  const hanzi = words.map((w) => (Array.isArray(w) ? w[0] : undefined));
  if (words.length < 2 || words.length > 3) e.push(`${at}: cần 2–3 từ`);
  if (!words.every((w) => Array.isArray(w) && w.length === 2 && w.every(isText))) e.push(`${at}: mỗi từ phải là [hán tự, pinyin]`);
  if (new Set(hanzi).size !== hanzi.length) e.push(`${at}: từ bị trùng`);
  for (const f of ['common', 'tip']) if (!isText(p[f])) e.push(`${at}: thiếu ${f}`);

  const rows = Array.isArray(p.rows) ? p.rows : [];
  if (rows.length < 2) e.push(`${at}: cần ≥ 2 dòng so sánh`);
  rows.forEach((r, j) => {
    if (!Array.isArray(r) || r.length !== words.length + 1 || !r.every(isText)) e.push(`${at}: dòng ${j + 1} phải có ${words.length + 1} ô`);
  });

  const ex = Array.isArray(p.examples) ? p.examples : [];
  ex.forEach((x, j) => {
    const ok = Array.isArray(x) && x.length === 4 && x.slice(0, 3).every(isText) && Number.isInteger(x[3]) && isText(hanzi[x[3]]);
    if (!ok) e.push(`${at}: ví dụ ${j + 1} phải là [hán tự, pinyin, nghĩa, chỉ số từ]`);
    else if (!x[0].includes(hanzi[x[3]])) e.push(`${at}: ví dụ ${j + 1} không chứa ${hanzi[x[3]]}`);
  });
  hanzi.forEach((h, k) => {
    if (isText(h) && ex.filter((x) => Array.isArray(x) && x[3] === k).length < 2) e.push(`${at}: ${h} cần ≥ 2 ví dụ`);
  });

  const qs = Array.isArray(p.questions) ? p.questions : [];
  if (qs.length < 4 || qs.length > 6) e.push(`${at}: cần 4–6 câu hỏi`);
  qs.forEach((q, j) => {
    const qa = `${at} câu ${j + 1}`;
    if (typeof q.q !== 'string' || q.q.split('___').length !== 2) e.push(`${qa}: q phải có đúng một ___`);
    if (!hanzi.includes(q.answer)) e.push(`${qa}: answer không phải từ của nhóm`);
    if (!isText(q.explain)) e.push(`${qa}: thiếu explain`);
  });
  hanzi.forEach((h) => {
    if (isText(h) && !qs.some((q) => q.answer === h)) e.push(`${at}: ${h} chưa là đáp án câu nào`);
  });

  // A group lives in the lesson of its newest HSK4 word (words outside vocab.json, e.g. HSK1-3, don't count).
  if (!hanzi.some((h) => home[h] === lesson)) e.push(`${at}: không từ nào thuộc từ vựng ${lesson}`);
  const later = hanzi.filter((h) => home[h] && order.indexOf(home[h]) > order.indexOf(lesson));
  if (later.length) e.push(`${at}: ${later.join(', ')} thuộc bài sau, nên chuyển nhóm sang bài đó`);
  return e;
}

// Every problem in the compare data, as readable messages; [] when it is valid. `vocab` is vocab.json.
export function validateCompare(data, vocab) {
  const order = Object.keys(vocab);
  const home = {}; // hanzi -> first lesson whose vocabulary has it
  for (const l of order) for (const w of vocab[l].words) home[w[0]] ??= l;
  const errors = [];
  const seen = new Set();
  for (const [lesson, pairs] of Object.entries(data)) {
    if (!order.includes(lesson)) errors.push(`${lesson}: không có trong vocab.json`);
    if (!Array.isArray(pairs)) {
      errors.push(`${lesson}: phải là mảng`);
      continue;
    }
    if (pairs.length && (pairs.length < 3 || pairs.length > 5)) errors.push(`${lesson}: cần 3–5 nhóm, có ${pairs.length}`);
    pairs.forEach((p, i) => {
      const id = `${lesson.slice(1)}.${i + 1}`;
      if (p.id !== id) errors.push(`${lesson}[${i}]: id phải là "${id}", đang là "${p.id}"`);
      if (seen.has(p.id)) errors.push(`id trùng: ${p.id}`);
      seen.add(p.id);
      errors.push(...checkPair(p, lesson, home, order));
    });
  }
  return errors;
}
