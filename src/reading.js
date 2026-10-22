// Reading practice (HSK4 exam parts 选词填空, 排列顺序 and 阅读理解): sets, runs and validation, with
// no React so Node tests can use them.
import RAW from './data/reading.json' with { type: 'json' };
import { shuffle } from './random.js';

// The three parts of the exam's reading section; only those in reading.json have content.
export const PART_TABS = [
  { id: 'p1', label: '① 选词填空' },
  { id: 'p2', label: '② 排列顺序' },
  { id: 'p3', label: '③ 阅读理解' },
];

export const PARTS = RAW.parts;
export const partById = (id) => PARTS.find((p) => p.id === id);

export const readKey = (id) => 'r:' + id;
const BLANK = '___';
export const LETTERS6 = ['A', 'B', 'C', 'D', 'E', 'F'];

// What a run steps through: the sets of a fill part, the questions of an order part.
export function unitsOf(part, typeId) {
  const all = part.sets || part.questions || [];
  return typeId ? all.filter((u) => u.type === typeId) : all;
}

export function typeCount(part) {
  const n = Object.fromEntries(part.types.map((t) => [t.id, 0]));
  for (const u of unitsOf(part)) n[u.type] = (n[u.type] || 0) + 1;
  return n;
}

// The units in random order, at most `max` of them.
export const buildRun = (units, { max = Infinity, rng = Math.random } = {}) => shuffle(units, rng).slice(0, max);

// The mixed run of a fill part: one random set of each type that has sets, in type order (as in the
// exam: sentences, then dialogues).
export const buildMix = (part, rng = Math.random) => part.types.map((t) => shuffle(unitsOf(part, t.id), rng)[0]).filter(Boolean);

export const REVIEW_MAX = { p1: 6, p2: 30, p3: 20 };
export const reviewUnits = (getMark, part) =>
  unitsOf(part)
    .filter((u) => getMark(readKey(u.id)) === 'r')
    .sort((a, b) => (a.id < b.id ? -1 : 1));

// Filling a set: `slots[i]` is the word index (0–5) placed in blank i, or null; `cur` is the blank
// that the next word goes to.
export const emptyFill = () => ({ slots: [null, null, null, null, null], cur: 0 });
export const selectSlot = (fill, i) => ({ ...fill, cur: i });
export const clearSlot = (fill) => ({ ...fill, slots: fill.slots.map((w, i) => (i === fill.cur ? null : w)) });
export const isFull = (fill) => fill.slots.every((w) => w !== null);

// Puts word `w` in the current blank (taking it out of any other blank), then moves to the next
// empty blank after it, wrapping round; stays put when none is empty. The example's word is used.
export function placeWord(fill, w, set) {
  if (w === set.example.answer) return fill;
  const slots = fill.slots.map((x, i) => (i === fill.cur ? w : x === w ? null : x));
  const n = slots.length;
  let cur = fill.cur;
  for (let k = 1; k <= n; k++) {
    const i = (fill.cur + k) % n;
    if (slots[i] === null) {
      cur = i;
      break;
    }
  }
  return { slots, cur };
}

export const usedWords = (set, slots) => new Set([set.example.answer, ...slots.filter((w) => w !== null)]);

export function gradeSet(set, slots) {
  const results = set.items.map((item, i) => slots[i] === item.answer);
  return { results, score: results.filter(Boolean).length };
}

export const filledText = (text, word) => text.replace(BLANK, word);

// What a key press does on a fill set, or null to ignore it: 'word:0'…'word:5' (a–f), 'slot:0'…
// 'slot:4' (1–5), 'clear' (Backspace), 'submit' (Enter once every blank is filled) and, once graded,
// 'next' (Enter). `target` is as in listening's keyAction: 'field', 'answer' (a word or blank button,
// which keeps focus after a click), 'control' (another button or link, which handles Enter itself) or
// 'other'. On an answer button Enter and Space would click it again and move a word, so they give
// 'none' (swallow the key) unless Enter submits.
export function fillKeyAction({ key, graded, full, target }) {
  if (target === 'field') return null;
  if (graded) return key === 'Enter' && target !== 'control' ? 'next' : null;
  if (key === 'Enter') return full && target !== 'control' ? 'submit' : target === 'answer' ? 'none' : null;
  if (key === ' ') return target === 'answer' ? 'none' : null;
  if (key === 'Backspace') return 'clear';
  if (String(key).length !== 1) return null;
  const w = 'abcdef'.indexOf(key.toLowerCase());
  if (w >= 0) return 'word:' + w;
  const s = '12345'.indexOf(key);
  return s >= 0 ? 'slot:' + s : null;
}

const PINYIN_KEY = 'hsk4_read_pinyin';
export function loadShowPinyin() {
  try {
    return localStorage.getItem(PINYIN_KEY) !== '0';
  } catch {
    return true;
  }
}
export function saveShowPinyin(b) {
  try {
    localStorage.setItem(PINYIN_KEY, b ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

const FORMATS = ['fill', 'order'];
const isText = (s) => typeof s === 'string' && s.trim() !== '';
const blanks = (s) => (typeof s === 'string' ? s.split(BLANK).length - 1 : 0);
const isWordIndex = (a) => Number.isInteger(a) && a >= 0 && a < 6;

function checkDialogue(item, at, errors) {
  for (const f of ['text', 'pinyin', 'vi']) {
    const lines = String(item[f]).split('\n');
    if (lines.length !== 2) errors.push(`${at}: câu hội thoại phải có đúng 2 dòng (${f})`);
    else if (f === 'text' && !lines.every((l, i) => l.startsWith(i === 0 ? 'A：' : 'B：') || l.startsWith(i === 0 ? 'B：' : 'A：')))
      errors.push(`${at}: mỗi dòng hội thoại phải bắt đầu bằng "A：" hoặc "B："`);
  }
}

// Checks one fill set; returns its answer sequence (example first) for the per-type check.
function checkFill(set, at, errors, isDialogue) {
  if (!Array.isArray(set.words) || set.words.length !== 6) errors.push(`${at}: words phải có đúng 6 từ`);
  else {
    set.words.forEach((w, i) => {
      for (const f of ['text', 'pinyin', 'vi']) if (!w || !isText(w[f])) errors.push(`${at}: words[${i}] thiếu ${f}`);
    });
    const texts = set.words.map((w) => w && w.text);
    if (new Set(texts).size !== texts.length) errors.push(`${at}: các từ phải khác nhau`);
  }
  const ex = set.example;
  if (!ex || blanks(ex.text) !== 1) errors.push(`${at}: example.text phải có đúng một ___`);
  if (!ex || !isWordIndex(ex.answer)) errors.push(`${at}: example.answer phải là số nguyên 0–5`);
  const answers = [ex && ex.answer];
  if (!Array.isArray(set.items) || set.items.length !== 5) errors.push(`${at}: items phải có đúng 5 câu`);
  else {
    set.items.forEach((item, i) => {
      const iat = `${at} câu ${i + 1}`;
      for (const f of ['text', 'pinyin', 'vi', 'explain']) if (!item || !isText(item[f])) errors.push(`${iat}: thiếu ${f}`);
      if (!item) return;
      if (blanks(item.text) !== 1) errors.push(`${iat}: text phải có đúng một ___`);
      if (!isWordIndex(item.answer)) errors.push(`${iat}: answer phải là số nguyên 0–5`);
      if (isDialogue && isText(item.text)) checkDialogue(item, iat, errors);
      answers.push(item.answer);
    });
    if (new Set(answers).size !== answers.length) errors.push(`${at}: đáp án của câu 例如 và 5 câu phải là 6 từ khác nhau`);
  }
  return answers.join(',');
}

const ORDERS = ['ACB', 'BAC', 'BCA', 'CAB', 'CBA'];

// Checks one order question; returns its answer for the per-type check.
function checkOrder(q, at, errors) {
  const ss = q.sentences;
  if (!Array.isArray(ss) || ss.length !== 3) errors.push(`${at}: sentences phải có đúng 3 câu`);
  else {
    ss.forEach((x, i) => {
      for (const f of ['text', 'pinyin', 'vi']) if (!x || !isText(x[f])) errors.push(`${at}: sentences[${i}] thiếu ${f}`);
    });
  }
  const okAnswer = ORDERS.includes(q.answer);
  if (!okAnswer) errors.push(`${at}: answer phải là một thứ tự của A, B, C khác "ABC"`);
  if (!Array.isArray(q.clues) || !q.clues.length) errors.push(`${at}: clues phải có ít nhất một manh mối`);
  else if (Array.isArray(ss)) {
    for (const c of q.clues) if (!isText(c) || !ss.some((x) => x && String(x.text).includes(c))) errors.push(`${at}: manh mối ${JSON.stringify(c)} không có trong câu nào`);
  }
  for (const f of ['first', 'next', 'last']) if (!q.explain || !isText(q.explain[f])) errors.push(`${at}: explain thiếu ${f}`);
  if (okAnswer && Array.isArray(ss) && ss.length === 3) {
    const last = ss['ABC'.indexOf(q.answer[2])];
    if (last && isText(last.text) && !/[。！？]$/.test(last.text)) errors.push(`${at}: câu cuối đoạn phải kết thúc bằng 。！？`);
  }
  return q.answer;
}

// Every problem in the reading data, as readable messages; [] when it is valid.
export function validateReading(data) {
  if (!data || !Array.isArray(data.parts)) return ['reading.json phải có mảng parts'];
  const errors = [];
  const seen = new Set();
  for (const part of data.parts) {
    if (!FORMATS.includes(part.format)) {
      errors.push(`${part.id}: format phải là một trong ${FORMATS.join(', ')}`);
      continue;
    }
    const typeIds = (part.types || []).map((t) => t.id);
    const idPattern = new RegExp(`^${part.id}-\\d{3}$`);
    const byType = {};
    for (const [i, u] of unitsOf(part).entries()) {
      const at = u && u.id ? u.id : `${part.id}[${i}]`;
      if (!u || typeof u !== 'object') {
        errors.push(`${at}: phải là object`);
        continue;
      }
      if (!idPattern.test(u.id)) errors.push(`${at}: id phải dạng ${part.id}-001`);
      else if (seen.has(u.id)) errors.push(`id trùng: ${u.id}`);
      seen.add(u.id);
      if (!typeIds.includes(u.type)) errors.push(`${at}: type ${JSON.stringify(u.type)} không có trong types`);
      (byType[u.type] ||= []).push(part.format === 'order' ? checkOrder(u, at, errors) : checkFill(u, at, errors, u.type === 'dialogue'));
    }
    for (const [t, answers] of Object.entries(byType)) {
      if (answers.length >= 2 && answers.every((a) => a === answers[0])) errors.push(`dạng ${t}: mọi ${part.format === 'order' ? 'câu' : 'bộ'} cùng một đáp án`);
    }
  }
  return errors;
}
