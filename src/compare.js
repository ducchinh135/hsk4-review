// Confusable word groups (the 125 groups of the reference book) and their practice logic, with no
// React so Node tests can use them.
import RAW from './data/compare.json' with { type: 'json' };
import { GRAMMAR_FILTERS, buildRoundRobin, countPoints, filterPoints } from './grammar.js';
import { shuffle } from './random.js';

export { FILTER_NAMES } from './grammar.js';

// Every group written so far, in id order ("001" … "125").
export const ALL_PAIRS = RAW;
export const PAIR_BY_ID = Object.fromEntries(ALL_PAIRS.map((p) => [p.id, p]));
export const TOTAL_PAIRS = 125;

// Initial letter of the pinyin, as in the book's table of contents -> [first id, last id].
export const LETTER_RANGES = {
  A: [1, 5],
  B: [6, 23],
  C: [24, 30],
  D: [31, 41],
  E: [42, 43],
  F: [44, 49],
  G: [50, 52],
  H: [53, 56],
  J: [57, 67],
  K: [68, 71],
  L: [72, 74],
  M: [75, 81],
  N: [82, 87],
  O: [88, 88],
  P: [89, 90],
  Q: [91, 95],
  R: [96, 98],
  S: [99, 103],
  T: [104, 106],
  W: [107, 109],
  X: [110, 115],
  Y: [116, 119],
  Z: [120, 125],
};
export const LETTER_ORDER = Object.keys(LETTER_RANGES);
// Letters that have at least one group written.
export const LETTERS = LETTER_ORDER.filter((l) => ALL_PAIRS.some((p) => p.letter === l));

export function letterOf(id) {
  if (!/^\d{3}$/.test(id)) return undefined;
  const n = Number(id);
  return LETTER_ORDER.find((l) => n >= LETTER_RANGES[l][0] && n <= LETTER_RANGES[l][1]);
}

export const pairsOfLetter = (letter, pairs = ALL_PAIRS) => pairs.filter((p) => p.letter === letter);

// Group marks live in the vocabulary marks store; the prefix keeps them apart from hanzi and grammar.
export const compareKey = (id) => 'c:' + id;
export const pairTitle = (p) => p.words.map((w) => w[0]).join(' / ');

// The group named by a URL hash ("#096"), or null when it is not a group written so far.
export function pairIdFromHash(hash, byId = PAIR_BY_ID) {
  try {
    const id = decodeURIComponent(String(hash).replace(/^#/, ''));
    return Object.hasOwn(byId, id) ? id : null;
  } catch {
    return null;
  }
}

export const COMPARE_FILTERS = GRAMMAR_FILTERS;
const FILTER_KEY = 'hsk4_compare_filter';
const FILTER_IDS = GRAMMAR_FILTERS.map(([f]) => f);
const LETTER_KEY = 'hsk4_compare_letter';

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

// The saved letter if it still has groups, else the first letter that does ('' when none is written yet).
export function loadCompareLetter(letters = LETTERS) {
  try {
    const l = localStorage.getItem(LETTER_KEY);
    if (letters.includes(l)) return l;
  } catch {
    /* private mode: fall through to the first letter */
  }
  return letters[0] || '';
}

export function saveCompareLetter(letter) {
  try {
    localStorage.setItem(LETTER_KEY, letter);
  } catch {
    /* private mode / quota: the letter just isn't remembered */
  }
}

export const filterPairs = (pairs, filter, getMark) => filterPoints(pairs, filter, getMark, compareKey);
export const countPairs = (pairs, getMark) => countPoints(pairs, getMark, compareKey);
export const reviewPairs = (getMark, pairs = ALL_PAIRS) => pairs.filter((p) => getMark(compareKey(p.id)) === 'r');

// For LetterTabs: known groups / groups of each letter.
export const compareProgress =
  (getMark, pairs = ALL_PAIRS) =>
  (letter) => {
    const c = countPairs(pairsOfLetter(letter, pairs), getMark);
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
  if (!plain) return [];
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
const MAX_QUESTIONS = 8;

function checkPair(p) {
  const e = [];
  const at = p.id;
  const words = Array.isArray(p.words) ? p.words : [];
  const hanzi = words.map((w) => (Array.isArray(w) ? w[0] : undefined));
  if (words.length < 2 || words.length > 5) e.push(`${at}: cần 2–5 từ`);
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
  const minQuestions = Math.max(4, words.length);
  if (qs.length < minQuestions || qs.length > MAX_QUESTIONS) e.push(`${at}: cần ${minQuestions}–${MAX_QUESTIONS} câu hỏi`);
  qs.forEach((q, j) => {
    const qa = `${at} câu ${j + 1}`;
    if (!q || typeof q !== 'object') {
      e.push(`${qa}: phải là object`);
      return;
    }
    if (typeof q.q !== 'string' || q.q.split('___').length !== 2) e.push(`${qa}: q phải có đúng một ___`);
    if (!hanzi.includes(q.answer)) e.push(`${qa}: answer không phải từ của nhóm`);
    if (!isText(q.explain)) e.push(`${qa}: thiếu explain`);
  });
  hanzi.forEach((h) => {
    if (isText(h) && !qs.some((q) => q && q.answer === h)) e.push(`${at}: ${h} chưa là đáp án câu nào`);
  });
  return e;
}

// Every problem in the compare data, as readable messages; [] when it is valid.
export function validateCompare(data) {
  if (!Array.isArray(data)) return ['compare.json phải là mảng'];
  const errors = [];
  let prev = 0;
  data.forEach((p, i) => {
    if (!p || typeof p !== 'object') {
      errors.push(`[${i}]: phải là object`);
      return;
    }
    const n = /^\d{3}$/.test(p.id) ? Number(p.id) : 0;
    if (n < 1 || n > TOTAL_PAIRS) errors.push(`[${i}]: id phải là 3 chữ số 001–125, đang là ${JSON.stringify(p.id)}`);
    else if (n === prev) errors.push(`id trùng: ${p.id}`);
    else if (n < prev) errors.push(`${p.id}: id không tăng dần`);
    if (n) {
      prev = Math.max(prev, n);
      if (p.letter !== letterOf(p.id)) errors.push(`${p.id}: letter phải là ${letterOf(p.id)}`);
    }
    errors.push(...checkPair(p));
  });
  return errors;
}
